import { bind, play, setEnabled, setVolume, unlock } from "cuelume";

const STORAGE_KEY = "loadflow-sound-enabled";
const MARKED_SELECTOR =
  "[data-cuelume-tap],[data-cuelume-type],[data-cuelume-select],[data-cuelume-toggle],[data-cuelume-open],[data-cuelume-close],[data-cuelume-navigate]";

let soundEnabled =
  typeof window !== "undefined"
    ? window.localStorage.getItem(STORAGE_KEY) !== "false"
    : true;
let audioUnlocked = false;
let lastDotInAt = 0;
let lastDotOutAt = 0;
const listeners = new Set();

function safePlay(sound, options) {
  try {
    play(sound, options);
  } catch {
    // Web Audio errors must never disrupt UI clicks or animation frames
  }
}

function safeUnlock() {
  try {
    return Promise.resolve(unlock()).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb(soundEnabled);
    } catch {
      // ignore listener errors
    }
  });
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function subscribeSoundChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function toggleSound() {
  soundEnabled = !soundEnabled;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(soundEnabled));
    } catch {
      // ignore storage failure
    }
  }
  try {
    setEnabled(soundEnabled);
  } catch {
    // ignore audio engine error
  }
  if (soundEnabled) {
    const ok = await safeUnlock();
    if (ok) audioUnlocked = true;
    safePlay("toggle", { emphasis: "strong", volume: 1 });
  }
  notifyListeners();
  return soundEnabled;
}

export function initSoundSystem() {
  if (typeof window === "undefined") return () => {};

  try {
    setVolume(1.0);
    setEnabled(soundEnabled);
  } catch {
    // ignore audio setup failure
  }

  const hadEmphasis = document.body?.hasAttribute("data-cuelume-emphasis");
  if (document.body && !hadEmphasis) {
    document.body.setAttribute("data-cuelume-emphasis", "strong");
  }

  let unbindCuelume = () => {};
  try {
    unbindCuelume = bind();
  } catch {
    unbindCuelume = () => {};
  }

  const handleFirstGesture = () => {
    if (!soundEnabled || audioUnlocked) return;
    safeUnlock().then((ok) => {
      if (ok) audioUnlocked = true;
    });
  };

  // Fallback click cue for any standard <button> that does not carry an explicit data-cuelume-* attribute
  const handleUnmarkedButtonClick = (e) => {
    if (!soundEnabled) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button");
    if (!button || button.disabled) return;
    if (button.closest(MARKED_SELECTOR)) return;

    if (!audioUnlocked) {
      safeUnlock().then((ok) => {
        if (ok) audioUnlocked = true;
      });
    }
    safePlay("tap", { emphasis: "strong", volume: 1 });
  };

  window.addEventListener("pointerdown", handleFirstGesture, { passive: true, capture: true });
  window.addEventListener("keydown", handleFirstGesture, { passive: true, capture: true });
  document.addEventListener("click", handleUnmarkedButtonClick, { passive: true });

  return () => {
    try {
      unbindCuelume();
    } catch {
      // ignore
    }
    if (document.body && !hadEmphasis) {
      document.body.removeAttribute("data-cuelume-emphasis");
    }
    window.removeEventListener("pointerdown", handleFirstGesture, { capture: true });
    window.removeEventListener("keydown", handleFirstGesture, { capture: true });
    document.removeEventListener("click", handleUnmarkedButtonClick);
  };
}

/**
 * Plays a crisp glassy cue only when a request dot enters the network from a client.
 * Never plays during travel ticks or intermediate LB hops.
 */
export function playDotIn(isHandshake = false) {
  if (!soundEnabled || !audioUnlocked) return;
  const now = performance.now();
  if (now - lastDotInAt < 145) return;
  lastDotInAt = now;

  safePlay("tap", {
    emphasis: "normal",
    volume: isHandshake ? 0.42 : 0.62,
  });
}

/**
 * Plays a warm confirmation cue (or distinct tone on error) only when a dot finishes its round trip at a client.
 * Never plays during travel ticks or intermediate LB hops.
 */
export function playDotOut(isError = false) {
  if (!soundEnabled || !audioUnlocked) return;
  const now = performance.now();
  if (now - lastDotOutAt < 165) return;
  lastDotOutAt = now;

  safePlay(isError ? "error" : "ready", {
    emphasis: "normal",
    volume: isError ? 0.65 : 0.55,
  });
}
