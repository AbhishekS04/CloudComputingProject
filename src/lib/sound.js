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
  setEnabled(soundEnabled);
  if (soundEnabled) {
    const ok = await unlock();
    if (ok) audioUnlocked = true;
    play("toggle", { emphasis: "strong", volume: 1 });
  }
  notifyListeners();
  return soundEnabled;
}

export function initSoundSystem() {
  if (typeof window === "undefined") return () => {};

  setVolume(1.0);
  setEnabled(soundEnabled);

  const hadEmphasis = document.body?.hasAttribute("data-cuelume-emphasis");
  if (document.body && !hadEmphasis) {
    document.body.setAttribute("data-cuelume-emphasis", "strong");
  }

  const unbindCuelume = bind();

  const handleFirstGesture = () => {
    if (!soundEnabled || audioUnlocked) return;
    unlock().then((ok) => {
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
      unlock().then((ok) => {
        if (ok) audioUnlocked = true;
      });
    }
    play("tap", { emphasis: "strong", volume: 1 });
  };

  window.addEventListener("pointerdown", handleFirstGesture, { passive: true, capture: true });
  window.addEventListener("keydown", handleFirstGesture, { passive: true, capture: true });
  document.addEventListener("click", handleUnmarkedButtonClick, { passive: true });

  return () => {
    unbindCuelume();
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

  play("tap", {
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

  play(isError ? "error" : "ready", {
    emphasis: "normal",
    volume: isError ? 0.65 : 0.55,
  });
}
