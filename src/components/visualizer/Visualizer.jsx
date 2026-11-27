import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSimulationStore } from '../../store/simulationStore';
import { useTrafficRunnerStore } from '../../store/trafficRunnerStore';
import { simulationEngine } from '../../simulation/engine';
import {
  getGatewayUrl,
  setGatewayUrl,
  resetGatewayUrl,
  getGatewayHost,
  subscribeGatewayChange,
} from '../../lib/gatewayConfig';
import {
  CLIENT_IPS,
  sendOne,
  runStressTest,
  runContinuousStream,
  runOverloadCrashTest,
  runNoLbCrashTest,
  runWithLbSurvivalTest,
  runShowcaseDemo,
  probeDirectVms,
  restoreAllApi,
  fetchStatsApi,
} from '../../lib/sendTraffic';
import Visualizer2D from './Visualizer2D';
import Visualizer3D from './Visualizer3D';
import {
  ThreeDCube,
  Layers,
  Activity,
  Flash,
  Flask,
  Play,
  Stop,
  ArrowRight,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Server,
  CheckCircle,
  ChartBar,
  Setting2,
  Trash,
  BrowserTerminal,
  ChevronDown,
} from 'reicon-react';
import { DuotoneIcon } from '../ui/DuotoneIcon';
import { SmoothDropdown } from '../ui/SmoothDropdown';

const IS_LIVE_BACKEND = true;

const ALGORITHMS = [
  { id: 'ROUND_ROBIN', label: 'Round Robin' },
  { id: 'LEAST_CONNECTIONS', label: 'Least Conn' },
  { id: 'IP_HASH', label: 'IP Hash' },
];

class VisualizerStageBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Visualizer render error' };
  }

  componentDidCatch() {
    // Error captured by boundary UI so the control bar remains responsive
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[380px] sm:min-h-[520px] p-6 text-center gap-3">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Visualizer recovered from a temporary glitch
          </p>
          <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 max-w-md">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="h-8 px-3.5 rounded-xl bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold cursor-pointer"
          >
            Reload Stage
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Visualizer
 * Master visualizer stage with docked full-width browser traffic dispatcher bar underneath.
 */
export default function Visualizer() {
  const visualizerMode = useSimulationStore((state) => state.visualizerMode);
  const setVisualizerMode = useSimulationStore((state) => state.setVisualizerMode);
  const clusterMode = useSimulationStore((state) => state.clusterMode);
  const setClusterMode = useSimulationStore((state) => state.setClusterMode);
  const algorithm = useSimulationStore((state) => state.algorithm);
  const setAlgorithm = useSimulationStore((state) => state.setAlgorithm);
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const setSelectedNode = useSimulationStore((state) => state.setSelectedNode);
  const servers = useSimulationStore((state) => state.servers);
  const isRunning = useSimulationStore((state) => state.isRunning);
  const targetRps = useSimulationStore((state) => state.targetRps);
  const setTargetRps = useSimulationStore((state) => state.setTargetRps);
  const toggleSimulation = useSimulationStore((state) => state.toggleSimulation);
  const lbOnline = useSimulationStore((state) => state.lbOnline);
  const lbPaused = useSimulationStore((state) => state.lbPaused);
  const setRemoteLbPaused = useSimulationStore((state) => state.setRemoteLbPaused);
  const isDarkMode = useSimulationStore((state) => state.isDarkMode);
  const setDarkMode = useSimulationStore((state) => state.setDarkMode);

  // Remote Azure LB-VM URL
  const [gatewayUrlState, setGatewayUrlState] = useState(() => getGatewayUrl());
  const [editingGateway, setEditingGateway] = useState(false);
  const [gatewayDraft, setGatewayDraft] = useState(() => getGatewayUrl());

  // Browser Traffic Dispatcher state (persisted in Zustand store across page navigation)
  const reqCount = useTrafficRunnerStore((state) => state.reqCount);
  const setReqCount = useTrafficRunnerStore((state) => state.setReqCount);
  const streamRate = useTrafficRunnerStore((state) => state.streamRate);
  const setStreamRate = useTrafficRunnerStore((state) => state.setStreamRate);
  const concurrency = useTrafficRunnerStore((state) => state.concurrency);
  const setConcurrency = useTrafficRunnerStore((state) => state.setConcurrency);
  const delaySec = useTrafficRunnerStore((state) => state.delaySec);
  const setDelaySec = useTrafficRunnerStore((state) => state.setDelaySec);
  const noLbTarget = useTrafficRunnerStore((state) => state.noLbTarget);
  const setNoLbTarget = useTrafficRunnerStore((state) => state.setNoLbTarget);
  const activeTask = useTrafficRunnerStore((state) => state.activeTask);
  const sendingSingle = useTrafficRunnerStore((state) => state.sendingSingle);
  const setSendingSingle = useTrafficRunnerStore((state) => state.setSendingSingle);
  const progress = useTrafficRunnerStore((state) => state.progress);
  const dispatchLogs = useTrafficRunnerStore((state) => state.dispatchLogs);
  const showLogs = useTrafficRunnerStore((state) => state.showLogs);
  const setShowLogs = useTrafficRunnerStore((state) => state.setShowLogs);
  const appendLog = useTrafficRunnerStore((state) => state.appendLog);
  const queueProgress = useTrafficRunnerStore((state) => state.queueProgress);
  const clearConsole = useTrafficRunnerStore((state) => state.clearConsole);
  const stopActiveTask = useTrafficRunnerStore((state) => state.stopActiveTask);
  const startTask = useTrafficRunnerStore((state) => state.startTask);

  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [scenariosFlipUp, setScenariosFlipUp] = useState(true);
  const [scenariosAlignRight, setScenariosAlignRight] = useState(true);

  const logBoxRef = useRef(null);
  const scenariosRef = useRef(null);

  useEffect(() => {
    return subscribeGatewayChange((nextUrl) => {
      setGatewayUrlState(nextUrl);
      setGatewayDraft(nextUrl);
    });
  }, []);

  useEffect(() => {
    if (!scenariosOpen) return;

    if (scenariosRef.current) {
      const rect = scenariosRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setScenariosFlipUp(spaceBelow < 340 && rect.top > 300);
      setScenariosAlignRight(rect.right >= 300);
    }

    const handleOutside = (e) => {
      if (scenariosRef.current && !scenariosRef.current.contains(e.target)) {
        setScenariosOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setScenariosOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [scenariosOpen]);

  useEffect(() => {
    if (!showLogs) return undefined;
    const el = logBoxRef.current;
    if (!el) return undefined;
    const rafId = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(rafId);
  }, [dispatchLogs, showLogs]);

  const parsedCount = Math.max(1, Math.min(2000, Number(reqCount) || 1));
  const parsedRate = Math.max(1, Math.min(50, Number(streamRate) || 1));
  const parsedConcurrency = Math.max(1, Math.min(60, Number(concurrency) || 10));
  const parsedDelay = Math.max(0, Math.min(5, Number(delaySec) || 0));

  const handleThemeChange = useCallback(
    (nextTheme) => setDarkMode(nextTheme === 'dark'),
    [setDarkMode]
  );

  const toggleViewMode = () => {
    setVisualizerMode(visualizerMode === '3D' ? '2D' : '3D');
  };

  const toggleClusterMode = () => {
    stopActiveTask();
    setClusterMode(clusterMode === 'live' ? 'dummy' : 'live');
  };

  const handleSaveGateway = (e) => {
    e.preventDefault();
    const saved = setGatewayUrl(gatewayDraft);
    setGatewayUrlState(saved);
    setEditingGateway(false);
    appendLog({
      id: `gw-${Date.now()}`,
      level: 'info',
      text: `[Gateway Updated] Remote LB-VM set to ${saved}`,
    });
  };

  const handleResetGateway = () => {
    const def = resetGatewayUrl();
    setGatewayUrlState(def);
    setGatewayDraft(def);
    setEditingGateway(false);
  };

  const handleBurst = () => {
    if (activeTask === 'burst') {
      stopActiveTask();
      return;
    }

    if (clusterMode === 'dummy') {
      if (!isRunning) toggleSimulation();
      const totalDummy = Math.min(parsedCount, 200);
      startTask('burst', async (signal) => {
        for (let i = 0; i < totalDummy; i++) {
          if (signal.aborted) break;
          simulationEngine.dispatchSingleRequest();
          await new Promise((resolve) => {
            const t = setTimeout(resolve, 20);
            signal.addEventListener('abort', () => {
              clearTimeout(t);
              resolve();
            }, { once: true });
          });
        }
      });
      return;
    }

    const isProxiedGateway = String(gatewayUrlState || '').startsWith('/');
    const burstWorkers = isProxiedGateway
      ? Math.min(8, parsedConcurrency, parsedCount)
      : Math.min(parsedConcurrency, parsedCount);

    startTask('burst', (signal) =>
      runStressTest({
        url: gatewayUrlState,
        count: parsedCount,
        concurrency: burstWorkers,
        delay: parsedDelay,
        label: 'BURST WAVE',
        signal,
        onLog: appendLog,
        onProgress: queueProgress,
      })
    );
  };

  const handleSingleRequest = async () => {
    if (clusterMode === 'dummy') {
      simulationEngine.dispatchSingleRequest();
      return;
    }
    if (sendingSingle) return;
    setSendingSingle(true);
    const clientIp = CLIENT_IPS[Math.floor(Math.random() * CLIENT_IPS.length)];
    try {
      await sendOne({
        url: gatewayUrlState,
        reqIdx: dispatchLogs.length + 1,
        clientIp,
        delay: parsedDelay,
        onLog: appendLog,
      });
    } catch (err) {
      appendLog({
        id: `single-err-${Date.now()}`,
        level: 'error',
        text: `Request failed: ${err?.message || 'Unexpected error'}`,
      });
    } finally {
      setSendingSingle(false);
    }
  };

  const handleToggleStream = () => {
    if (clusterMode === 'dummy') {
      setTargetRps(parsedRate);
      toggleSimulation();
      return;
    }
    if (activeTask === 'stream') {
      stopActiveTask();
      return;
    }
    startTask('stream', (signal) =>
      runContinuousStream({
        url: gatewayUrlState,
        count: parsedCount,
        rate: parsedRate,
        delay: parsedDelay,
        signal,
        onLog: appendLog,
        onProgress: queueProgress,
      })
    );
  };

  const hasUnhealthyVm = servers.some((s) => s.status !== 'healthy' && !s.healthy);
  const lastLog = dispatchLogs.length > 0 ? dispatchLogs[dispatchLogs.length - 1] : null;
  const gatewayShortHost = getGatewayHost(gatewayUrlState).replace(/:5000$/, '');

  const chipBtnClass =
    'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-white/90 hover:bg-white dark:bg-[#22212B] dark:hover:bg-[#2B2A36] border border-[#DDD6C6] dark:border-white/[0.08] text-[11px] sm:text-xs font-medium text-charcoal-900 dark:text-cream-100 shadow-2xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-45 whitespace-nowrap';

  return (
    <div className="relative flex flex-col gap-2.5 w-full transition-all">
      {/* Non-blocking Load Balancer Offline Banner (Live Mode only) */}
      <AnimatePresence initial={false}>
        {clusterMode === 'live' && IS_LIVE_BACKEND && !lbOnline && (
          <motion.div
            key="lb-offline-banner"
            initial={{ height: 0, opacity: 0, y: -4 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -4 }}
            transition={{
              height: { type: 'spring', stiffness: 300, damping: 28 },
              opacity: { duration: 0.18 },
            }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 dark:bg-red-950/50 border border-red-500/40 text-xs">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold">
                <span>Remote LB-VM Unreachable ({getGatewayHost(gatewayUrlState)})</span>
                <span className="hidden sm:inline font-normal text-red-600/80 dark:text-red-300/80">
                  — Waiting for online Azure gateway response, or switch to Dummy Sim.
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setEditingGateway(true)}
                  className="px-2.5 py-1 rounded bg-white/70 dark:bg-black/30 border border-red-500/25 text-red-700 dark:text-red-200 hover:bg-white font-sans font-semibold transition-colors cursor-pointer"
                >
                  Change VM IP
                </button>
                <button
                  type="button"
                  onClick={() => setClusterMode('dummy')}
                  className="px-2.5 py-1 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25 font-sans font-semibold transition-colors cursor-pointer"
                >
                  Dummy Sim
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {clusterMode === 'live' && IS_LIVE_BACKEND && lbOnline && lbPaused && (
          <motion.div
            key="lb-paused-banner"
            initial={{ height: 0, opacity: 0, y: -4 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -4 }}
            transition={{
              height: { type: 'spring', stiffness: 300, damping: 28 },
              opacity: { duration: 0.18 },
            }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 dark:bg-amber-950/50 border border-amber-500/40 text-xs">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
                <span>Remote Azure LB-VM is Paused (returning 503)</span>
                <span className="hidden sm:inline font-normal text-amber-700/80 dark:text-amber-300/80">
                  — Health is 200 OK, but traffic endpoints are paused on {getGatewayHost(gatewayUrlState)}.
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setRemoteLbPaused(false)}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-900 dark:text-amber-100 font-sans font-semibold transition-colors cursor-pointer"
                >
                  Resume LB-VM
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Unobstructed Canvas Viewport */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 bg-[#FAF8F2] dark:bg-charcoal-900 shadow-subtle min-h-[380px] sm:min-h-[520px] lg:min-h-[640px]">
        <VisualizerStageBoundary>
          {visualizerMode === '3D' && (
            <Visualizer3D
              theme={isDarkMode ? 'dark' : 'light'}
              onThemeChange={handleThemeChange}
              onSelectNode={setSelectedNode}
              selectedNode={selectedNode}
            />
          )}

          {visualizerMode === '2D' && (
            <Visualizer2D
              theme={isDarkMode ? 'dark' : 'light'}
              onThemeChange={handleThemeChange}
              onSelectNode={setSelectedNode}
              selectedNode={selectedNode}
            />
          )}
        </VisualizerStageBoundary>
      </div>

      {/* 2. Minimal Docked Dispatcher & Telemetry Bar Under Visualizer */}
      <div className="relative z-30 w-full rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 bg-[#FAF8F2]/95 dark:bg-[#191820]/95 shadow-subtle text-xs select-none">
        {/* Primary Single-Row Toolbar */}
        <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-2 p-2 sm:px-3">
          {/* Left: View (3D/2D), Mode (Azure/Dummy), Algorithm Dropdown */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Compact Segmented 3D / 2D Switcher */}
            <div
              role="group"
              aria-label="Visualizer projection mode"
              className="inline-flex items-center h-8 p-0.5 rounded-xl bg-[#ECE6D8]/80 dark:bg-[#111016] border border-[#DDD6C6] dark:border-white/[0.08]"
            >
              {[
                { id: '3D', label: '3D', icon: ThreeDCube },
                { id: '2D', label: '2D', icon: Layers },
              ].map((opt) => {
                const active = visualizerMode === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-cuelume-select
                    onClick={() => visualizerMode !== opt.id && toggleViewMode()}
                    className={`inline-flex items-center gap-1 h-full px-2.5 rounded-[9px] text-[11px] font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-[#2A2936] text-neutral-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    <Icon size={12} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Azure vs Dummy Sim Toggle */}
            <button
              type="button"
              data-cuelume-select
              onClick={toggleClusterMode}
              title="Switch between Live Azure VM cluster and local Dummy Sim"
              className={chipBtnClass}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  clusterMode === 'live'
                    ? lbOnline
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-rose-500'
                    : 'bg-purple-500'
                }`}
              />
              <span>{clusterMode === 'live' ? 'Azure Live' : 'Dummy Sim'}</span>
            </button>

            {/* Smooth Algorithm Selector */}
            <SmoothDropdown
              value={algorithm}
              onChange={(nextAlgo) => setAlgorithm(nextAlgo)}
              ariaLabel="Routing algorithm"
              placement="auto"
              options={ALGORITHMS.map((a) => ({ value: a.id, label: a.label }))}
              triggerClassName="min-w-[116px]"
            />
          </div>

          {/* Center: Reqs + Stream Capsule -> Burst -> 1 Req */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Connected Reqs + Stream Capsule */}
            <div className="inline-flex items-center h-8 rounded-xl bg-white dark:bg-[#22212B] border border-[#DDD6C6] dark:border-white/[0.1] overflow-hidden shadow-2xs focus-within:ring-2 focus-within:ring-[#007AFF]/35">
              <label className="inline-flex items-center gap-1 h-full pl-2.5 pr-2 cursor-text">
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={reqCount}
                  onChange={(e) => setReqCount(e.target.value)}
                  aria-label="Number of requests"
                  className="w-11 bg-transparent font-mono text-xs font-semibold text-neutral-900 dark:text-white text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10.5px] font-medium text-neutral-400 dark:text-neutral-500">
                  reqs
                </span>
              </label>

              <span className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.1]" />

              <button
                type="button"
                disabled={Boolean(activeTask && activeTask !== 'stream')}
                onClick={handleToggleStream}
                title={clusterMode === 'live' ? `Stream ${parsedCount} requests @ ${parsedRate} req/s` : 'Pause / Resume stream'}
                className={`inline-flex items-center gap-1.5 h-full px-3 text-[11px] sm:text-xs font-medium transition-colors cursor-pointer disabled:opacity-45 whitespace-nowrap ${
                  clusterMode === 'live' && activeTask === 'stream'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold'
                    : clusterMode === 'dummy' && !isRunning
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
                    : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-charcoal-900 dark:text-cream-100'
                }`}
              >
                {clusterMode === 'live' ? (
                  activeTask === 'stream' ? (
                    <>
                      <Stop size={12} weight="Filled" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Play size={12} />
                      <span>Stream</span>
                      <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
                        {parsedRate}/s
                      </span>
                    </>
                  )
                ) : (
                  <>
                    <Play size={12} />
                    <span>{isRunning ? 'Pause' : 'Resume'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Standalone Burst / In-place Stop Button */}
            <button
              type="button"
              disabled={Boolean(activeTask && activeTask !== 'burst')}
              onClick={handleBurst}
              title={activeTask === 'burst' ? 'Stop active burst' : `Send Burst of ${parsedCount} requests`}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-white text-[11px] sm:text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-45 whitespace-nowrap ${
                activeTask === 'burst'
                  ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                  : 'bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#0062C4]'
              }`}
            >
              {activeTask === 'burst' ? (
                <>
                  <Stop size={12} weight="Filled" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Flash size={13} weight="Filled" />
                  <span>Burst</span>
                </>
              )}
            </button>

            {/* Single Request */}
            <button
              type="button"
              disabled={Boolean(activeTask) || sendingSingle}
              onClick={handleSingleRequest}
              className={chipBtnClass}
              title="Send 1 request from browser"
            >
              <ArrowRight size={13} className={`text-[#007AFF] ${sendingSingle ? 'animate-pulse' : ''}`} />
              <span>{sendingSingle ? 'Sending...' : '1 Req'}</span>
            </button>
          </div>

          {/* Right: Scenarios Dropdown + Restore + Parameters/Gateway + Console */}
          <div className="flex flex-wrap items-center gap-1.5 xl:ml-auto">
            {clusterMode === 'live' && (
              <>
                {/* Smooth Scenarios Popover Menu */}
                <div ref={scenariosRef} className="relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={scenariosOpen}
                    onClick={() => setScenariosOpen((prev) => !prev)}
                    className={`${chipBtnClass} ${
                      scenariosOpen
                        ? 'border-[#007AFF]/50 ring-2 ring-[#007AFF]/15'
                        : ''
                    }`}
                  >
                    <DuotoneIcon
                      icon={Flask}
                      size={13}
                      className="text-neutral-600 dark:text-neutral-300"
                      secondaryOpacity={0.22}
                    />
                    <span>Scenarios</span>
                    <motion.span
                      animate={{ rotate: scenariosOpen ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                      className="inline-flex opacity-60"
                    >
                      <ChevronDown size={12} />
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {scenariosOpen && (
                      <motion.div
                        key="scenarios-popover"
                        initial={{
                          opacity: 0,
                          scale: 0.94,
                          y: scenariosFlipUp ? 6 : -6,
                          filter: 'blur(4px)',
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          y: 0,
                          filter: 'blur(0px)',
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.95,
                          y: scenariosFlipUp ? 5 : -5,
                          filter: 'blur(4px)',
                        }}
                        transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.8 }}
                        style={{
                          transformOrigin: `${scenariosFlipUp ? 'bottom' : 'top'} ${scenariosAlignRight ? 'right' : 'left'}`,
                        }}
                        className={`absolute z-50 w-[min(288px,calc(100vw-2rem))] rounded-2xl p-1.5 bg-white/95 dark:bg-[#191821]/95 backdrop-blur-xl border border-[#DDD6C6] dark:border-white/[0.12] shadow-xl shadow-black/15 dark:shadow-black/60 ${
                          scenariosAlignRight ? 'right-0' : 'left-0'
                        } ${
                          scenariosFlipUp ? 'bottom-full mb-2' : 'top-full mt-2'
                        }`}
                      >
                        {/* No-LB Victim Picker inside menu */}
                        <div className="px-2 py-1.5 mb-1 border-b border-black/[0.06] dark:border-white/[0.08]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                              No-LB Target
                            </span>
                            <div className="inline-flex items-center gap-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] p-0.5">
                              {[
                                { id: 'random', label: 'Any' },
                                ...servers.map((s, idx) => ({
                                  id: s.id,
                                  label: String.fromCharCode(65 + idx),
                                })),
                              ].map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setNoLbTarget(t.id)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer ${
                                    noLbTarget === t.id
                                      ? 'bg-white dark:bg-[#2F2E3B] text-neutral-900 dark:text-white font-semibold shadow-2xs'
                                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                                  }`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          {[
                            {
                              id: 'overload',
                              label: 'Overload Crash',
                              desc: 'Flood cluster to trip circuit breaker & failover',
                              icon: AlertTriangle,
                              dot: 'bg-amber-500',
                              run: () =>
                                startTask('overload', (signal) =>
                                  runOverloadCrashTest({
                                    url: gatewayUrlState,
                                    count: Math.max(30, parsedCount),
                                    concurrency: Math.max(parsedConcurrency, 35),
                                    delay: Math.max(parsedDelay, 1.5),
                                    signal,
                                    onLog: appendLog,
                                    onProgress: queueProgress,
                                  })
                                ),
                            },
                            {
                              id: 'no-lb',
                              label: 'No-LB Attack',
                              desc: 'Bypass load balancer and saturate one VM',
                              icon: ShieldAlert,
                              dot: 'bg-rose-500',
                              run: () =>
                                startTask('no-lb', (signal) =>
                                  runNoLbCrashTest({
                                    targetServer: noLbTarget === 'random' ? null : noLbTarget,
                                    count: Math.max(25, parsedCount),
                                    concurrency: Math.max(parsedConcurrency, 20),
                                    signal,
                                    onLog: appendLog,
                                    onProgress: queueProgress,
                                  })
                                ),
                            },
                            {
                              id: 'with-lb',
                              label: 'With-LB Protect',
                              desc: 'Spread heavy requests safely across all VMs',
                              icon: ShieldCheck,
                              dot: 'bg-emerald-500',
                              run: () =>
                                startTask('with-lb', (signal) =>
                                  runWithLbSurvivalTest({
                                    url: gatewayUrlState,
                                    count: Math.max(25, parsedCount),
                                    concurrency: Math.max(parsedConcurrency, 20),
                                    signal,
                                    onLog: appendLog,
                                    onProgress: queueProgress,
                                  })
                                ),
                            },
                            {
                              id: 'stress',
                              label: `Stress Test (${parsedCount})`,
                              desc: `High-concurrency wave (${parsedConcurrency} workers)`,
                              icon: Activity,
                              dot: 'bg-blue-500',
                              run: () =>
                                startTask('stress', (signal) =>
                                  runStressTest({
                                    url: gatewayUrlState,
                                    count: parsedCount,
                                    concurrency: parsedConcurrency,
                                    delay: parsedDelay,
                                    label: 'STRESS TEST',
                                    signal,
                                    onLog: appendLog,
                                    onProgress: queueProgress,
                                  })
                                ),
                            },
                            {
                              id: 'demo',
                              label: '4-Act Live Demo',
                              desc: 'Automated health, RR, crash & recovery flow',
                              icon: Play,
                              dot: 'bg-indigo-500',
                              run: () =>
                                startTask(
                                  'demo',
                                  (signal) =>
                                    runShowcaseDemo({
                                      url: gatewayUrlState,
                                      signal,
                                      onLog: appendLog,
                                      onProgress: queueProgress,
                                    }),
                                  { openConsole: true }
                                ),
                            },
                          ].map((item, idx) => {
                            const Icon = item.icon;
                            return (
                              <motion.button
                                key={item.id}
                                type="button"
                                disabled={Boolean(activeTask)}
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.02, duration: 0.14 }}
                                onClick={() => {
                                  setScenariosOpen(false);
                                  item.run();
                                }}
                                className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-neutral-900/[0.045] dark:hover:bg-white/[0.07] disabled:opacity-45 transition-colors cursor-pointer"
                              >
                                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-neutral-900 dark:text-neutral-100">
                                    <Icon size={12} className="opacity-75 shrink-0" />
                                    <span>{item.label}</span>
                                  </div>
                                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                    {item.desc}
                                  </p>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>

                        <div className="mt-1 pt-1 border-t border-black/[0.06] dark:border-white/[0.08] grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            disabled={Boolean(activeTask)}
                            onClick={() => {
                              setScenariosOpen(false);
                              startTask(
                                'probe',
                                (signal) =>
                                  probeDirectVms({
                                    url: gatewayUrlState,
                                    signal,
                                    onLog: appendLog,
                                  }),
                                { openConsole: true }
                              );
                            }}
                            className="flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-900/[0.05] dark:hover:bg-white/[0.07] disabled:opacity-45 cursor-pointer transition-colors"
                          >
                            <Server size={12} className="text-sky-500" />
                            <span>Probe VMs</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScenariosOpen(false);
                              setShowLogs(true);
                              fetchStatsApi(gatewayUrlState, { onLog: appendLog });
                            }}
                            className="flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-900/[0.05] dark:hover:bg-white/[0.07] cursor-pointer transition-colors"
                          >
                            <ChartBar size={12} className="text-blue-500" />
                            <span>LB Stats</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Quick Cluster Restore */}
                <button
                  type="button"
                  onClick={() => restoreAllApi(gatewayUrlState, { onLog: appendLog })}
                  title="Recover all backend VMs to healthy state"
                  className={
                    hasUnhealthyVm
                      ? 'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/20 border border-emerald-500/35 text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer whitespace-nowrap'
                      : chipBtnClass
                  }
                >
                  <CheckCircle
                    size={13}
                    className={hasUnhealthyVm ? 'text-emerald-500' : 'text-neutral-500 dark:text-neutral-400'}
                  />
                  <span>Restore</span>
                </button>
              </>
            )}

            {/* Global Abort Button when a scenario task is active */}
            {activeTask && activeTask !== 'stream' && activeTask !== 'burst' && (
              <button
                type="button"
                onClick={stopActiveTask}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap"
              >
                <Stop size={11} weight="Filled" />
                <span>Stop</span>
              </button>
            )}

            {/* Gateway & Traffic Tuning Toggle */}
            <button
              type="button"
              onClick={() => setEditingGateway((prev) => !prev)}
              title="Configure rate, delay, concurrency, and remote LB-VM IP"
              className={`${chipBtnClass} ${
                editingGateway ? 'border-[#007AFF]/50 ring-2 ring-[#007AFF]/15' : ''
              }`}
            >
              <Setting2 size={13} className="opacity-70" />
              <span className="hidden sm:inline font-mono text-[10.5px] text-neutral-600 dark:text-neutral-300 max-w-[118px] truncate">
                {clusterMode === 'live' ? gatewayShortHost : `${targetRps}/s`}
              </span>
            </button>

            {/* Console Toggle */}
            {clusterMode === 'live' && (
              <button
                type="button"
                onClick={() => setShowLogs((prev) => !prev)}
                title="Toggle browser traffic console"
                className={`${chipBtnClass} ${
                  showLogs ? 'border-[#007AFF]/50 ring-2 ring-[#007AFF]/15' : ''
                }`}
              >
                <BrowserTerminal size={13} className="opacity-75" />
                <span>Log</span>
                {progress.completed > 0 ? (
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      progress.fail > 0 && progress.ok === 0
                        ? 'text-rose-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {progress.ok}/{progress.total || progress.completed}
                  </span>
                ) : dispatchLogs.length > 0 ? (
                  <span className="font-mono text-[10px] text-neutral-400">
                    {dispatchLogs.length}
                  </span>
                ) : null}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Single-Line Parameters & Gateway Editor Drawer */}
        <AnimatePresence initial={false}>
          {editingGateway && (
            <motion.form
              key="gateway-editor-drawer"
              initial={{ height: 0, opacity: 0, y: -4, filter: 'blur(3px)' }}
              animate={{ height: 'auto', opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ height: 0, opacity: 0, y: -4, filter: 'blur(3px)' }}
              transition={{
                height: { type: 'spring', stiffness: 310, damping: 28 },
                opacity: { duration: 0.16 },
                filter: { duration: 0.16 },
              }}
              onSubmit={handleSaveGateway}
              className="overflow-hidden border-t border-black/[0.06] dark:border-white/[0.07]"
            >
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-[#F3EFE5]/70 dark:bg-[#131219]/90">
                {/* Rate/s */}
                <label className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white dark:bg-[#17161D] border border-black/[0.08] dark:border-white/[0.1]">
                  <span className="text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400">
                    Rate/s
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={clusterMode === 'dummy' ? 5000 : 50}
                    value={clusterMode === 'dummy' ? targetRps : streamRate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (clusterMode === 'dummy') {
                        setTargetRps(Math.max(1, Math.min(5000, Number(val) || 1)));
                      } else {
                        setStreamRate(val);
                      }
                    }}
                    className="w-11 bg-transparent font-mono text-xs font-semibold text-neutral-900 dark:text-white text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </label>

                {clusterMode === 'live' && (
                  <>
                    <label className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white dark:bg-[#17161D] border border-black/[0.08] dark:border-white/[0.1]">
                      <span className="text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400">
                        Workers
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={concurrency}
                        onChange={(e) => setConcurrency(e.target.value)}
                        className="w-10 bg-transparent font-mono text-xs font-semibold text-neutral-900 dark:text-white text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </label>

                    <label className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white dark:bg-[#17161D] border border-black/[0.08] dark:border-white/[0.1]">
                      <span className="text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400">
                        Delay(s)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step="0.1"
                        value={delaySec}
                        onChange={(e) => setDelaySec(e.target.value)}
                        className="w-10 bg-transparent font-mono text-xs font-semibold text-neutral-900 dark:text-white text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </label>

                    <div className="flex w-full sm:w-auto sm:flex-1 sm:min-w-[220px] items-center gap-1.5 sm:ml-auto">
                      <span className="hidden sm:inline text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                        LB-VM
                      </span>
                      <input
                        type="text"
                        value={gatewayDraft}
                        onChange={(e) => setGatewayDraft(e.target.value)}
                        placeholder="http://20.244.34.101:5000"
                        className="flex-1 h-8 px-2.5 rounded-lg bg-white dark:bg-[#17161D] border border-black/[0.08] dark:border-white/[0.1] font-mono text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                      />
                      <button
                        type="submit"
                        className="h-8 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleResetGateway}
                        className="h-8 px-2.5 rounded-lg bg-white dark:bg-[#23222C] border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Quiet 1-Line Live Status Ticker (shown instead of a blank box when Log is collapsed) */}
        <AnimatePresence initial={false}>
          {clusterMode === 'live' && !showLogs && (lastLog || progress.completed > 0) && (
            <motion.div
              key="compact-status-ticker"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="overflow-hidden border-t border-black/[0.06] dark:border-white/[0.07]"
            >
              <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-[11px] font-mono bg-[#F3EFE5]/80 dark:bg-[#131219]/95 rounded-b-2xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  {progress.completed > 0 && (
                    <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                      {progress.completed}
                      {progress.total ? `/${progress.total}` : ''} ·{' '}
                      <span className="text-emerald-600 dark:text-emerald-400">{progress.ok} OK</span>
                      {progress.fail > 0 && (
                        <span className="text-rose-500 dark:text-rose-400"> · {progress.fail} Err</span>
                      )}
                    </span>
                  )}
                  {lastLog && (
                    <span
                      className={`truncate ${
                        lastLog.level === 'error'
                          ? 'text-rose-600 dark:text-rose-400'
                          : lastLog.level === 'success'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : lastLog.level === 'warning'
                          ? 'text-amber-600 dark:text-amber-300'
                          : 'text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {lastLog.text}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowLogs(true)}
                    className="text-[10.5px] font-sans font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                  >
                    Expand
                  </button>
                  <button
                    type="button"
                    onClick={clearConsole}
                    className="text-[10.5px] font-sans text-neutral-400 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smooth Expanding Compact Telemetry Console */}
        <AnimatePresence initial={false}>
          {showLogs && clusterMode === 'live' && (
            <motion.div
              key="browser-traffic-console"
              initial={{ height: 0, opacity: 0, y: -4, filter: 'blur(3px)' }}
              animate={{ height: 'auto', opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ height: 0, opacity: 0, y: -4, filter: 'blur(3px)' }}
              transition={{
                height: { type: 'spring', stiffness: 290, damping: 28 },
                opacity: { duration: 0.18 },
                filter: { duration: 0.16 },
              }}
              className="overflow-hidden border-t border-black/[0.06] dark:border-white/[0.08]"
            >
              <div className="bg-[#111216] rounded-b-2xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.07] text-[10.5px] font-mono text-neutral-400">
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-200 font-semibold">Traffic Console</span>
                    {(progress.completed > 0 || progress.total > 0) && (
                      <span className="tabular-nums">
                        {progress.completed}
                        {progress.total ? `/${progress.total}` : ''} ·{' '}
                        <span className="text-emerald-400">{progress.ok} OK</span>
                        {progress.fail > 0 && (
                          <span className="text-rose-400"> · {progress.fail} Err</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {(dispatchLogs.length > 0 || progress.completed > 0) && (
                      <button
                        type="button"
                        onClick={clearConsole}
                        className="inline-flex items-center gap-1 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        <Trash size={11} />
                        <span>Clear</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowLogs(false)}
                      className="text-neutral-400 hover:text-white cursor-pointer"
                    >
                      Hide
                    </button>
                  </div>
                </div>

                <div
                  ref={logBoxRef}
                  data-lenis-prevent
                  className="max-h-40 overflow-y-auto px-3 py-2 space-y-1 font-mono text-[10.5px] leading-relaxed"
                >
                  {dispatchLogs.length === 0 ? (
                    <div className="py-3 text-center text-neutral-500">
                      No events yet — run Burst, Stream, or a Scenario above.
                    </div>
                  ) : (
                    dispatchLogs.map((entry) => (
                      <div
                        key={entry.id}
                        className={
                          entry.level === 'error'
                            ? 'text-rose-400'
                            : entry.level === 'success'
                            ? 'text-emerald-400'
                            : entry.level === 'warning'
                            ? 'text-amber-300'
                            : 'text-sky-300'
                        }
                      >
                        {entry.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
