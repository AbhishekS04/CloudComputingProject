import { create } from 'zustand';
import { simulationEngine } from '../simulation/engine';

// Module-level handles so active traffic tasks keep running across page navigation
let activeAbortCtrl = null;
let pendingLogs = [];
let pendingProgress = null;
let flushTimer = null;

function flushRunnerUpdates() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const hasLogs = pendingLogs.length > 0;
  const hasProgress = pendingProgress !== null;
  if (!hasLogs && !hasProgress) return;

  const queuedLogs = hasLogs ? pendingLogs : null;
  const nextProgress = hasProgress ? pendingProgress : null;
  pendingLogs = [];
  pendingProgress = null;

  useTrafficRunnerStore.setState((state) => ({
    ...(queuedLogs ? { dispatchLogs: [...state.dispatchLogs, ...queuedLogs].slice(-80) } : {}),
    ...(nextProgress ? { progress: nextProgress } : {}),
  }));
}

function scheduleRunnerFlush() {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(flushRunnerUpdates, 32);
}

export const useTrafficRunnerStore = create((set, get) => ({
  reqCount: 30,
  streamRate: 5,
  concurrency: 20,
  delaySec: 0,
  noLbTarget: 'random',
  activeTask: null,
  sendingSingle: false,
  progress: { completed: 0, total: 0, ok: 0, fail: 0 },
  dispatchLogs: [],
  showLogs: false,

  setReqCount: (reqCount) => set({ reqCount }),
  setStreamRate: (streamRate) => set({ streamRate }),
  setConcurrency: (concurrency) => set({ concurrency }),
  setDelaySec: (delaySec) => set({ delaySec }),
  setNoLbTarget: (noLbTarget) => set({ noLbTarget }),
  setSendingSingle: (sendingSingle) => set({ sendingSingle }),
  setShowLogs: (value) =>
    set((state) => ({
      showLogs: typeof value === 'function' ? value(state.showLogs) : Boolean(value),
    })),

  appendLog: (entry) => {
    pendingLogs.push(entry);
    if (pendingLogs.length > 80) {
      pendingLogs = pendingLogs.slice(-80);
    }
    scheduleRunnerFlush();
  },

  queueProgress: (next) => {
    pendingProgress = next;
    scheduleRunnerFlush();
  },

  clearConsole: () => {
    pendingLogs = [];
    pendingProgress = null;
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    const isTaskRunning = Boolean(get().activeTask);
    if (!isTaskRunning) {
      simulationEngine.startFreshRun({ fetchRemoteBaseline: true }).catch(() => {});
    }
    set((state) => ({
      dispatchLogs: [],
      progress: isTaskRunning ? state.progress : { completed: 0, total: 0, ok: 0, fail: 0 },
    }));
  },

  stopActiveTask: () => {
    activeAbortCtrl?.abort();
    activeAbortCtrl = null;
    set({ activeTask: null });
  },

  startTask: (taskName, runner, { openConsole = false } = {}) => {
    get().stopActiveTask();
    pendingLogs = [];
    pendingProgress = null;
    const ctrl = new AbortController();
    activeAbortCtrl = ctrl;

    set((state) => ({
      activeTask: taskName,
      showLogs: openConsole ? true : state.showLogs,
      progress: { completed: 0, total: 0, ok: 0, fail: 0 },
    }));

    Promise.resolve()
      .then(async () => {
        await simulationEngine.startFreshRun({ fetchRemoteBaseline: true });
        if (ctrl.signal.aborted) return;
        await runner(ctrl.signal, get().appendLog, get().queueProgress);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          get().appendLog({
            id: `err-${Date.now()}`,
            level: 'error',
            text: `Task error: ${err?.message || 'Unexpected error'}`,
          });
        }
      })
      .finally(() => {
        flushRunnerUpdates();
        if (activeAbortCtrl === ctrl) {
          activeAbortCtrl = null;
          set({ activeTask: null });
        }
      });
  },
}));
