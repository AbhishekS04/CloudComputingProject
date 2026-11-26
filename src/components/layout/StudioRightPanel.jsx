import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ServerNodeCard from '../ui/ServerNodeCard';
import { SmoothDropdown } from '../ui/SmoothDropdown';
import { useSimulationStore } from '../../store/simulationStore';
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
import {
  Server,
  Slider,
  Flash,
  Play,
  Pause,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Refresh,
  Stop,
  Activity,
  Flask,
  Globe,
  ChartBar,
  CheckCircle,
  Setting2,
  Trash,
} from 'reicon-react';
import { DuotoneIcon } from '../ui/DuotoneIcon';

const RPS_LEVELS = [
  { val: 12, label: '12/s' },
  { val: 45, label: '45/s' },
  { val: 180, label: '180/s' },
  { val: 1000, label: '1K/s' },
  { val: 5000, label: '5K/s' },
];

const REQ_COUNT_PRESETS = [10, 30, 100, 250];

const ALGORITHMS = [
  {
    id: 'ROUND ROBIN',
    label: 'Round Robin',
    tag: 'Cyclic',
    desc: 'Sequentially distributes traffic across active nodes in fixed rotation.',
  },
  {
    id: 'LEAST CONN',
    label: 'Least Conn',
    tag: 'Load-Aware',
    desc: 'Dispatches requests to the node with fewest active TCP sockets.',
  },
  {
    id: 'IP HASH',
    label: 'IP Hash',
    tag: 'Deterministic',
    desc: 'Hashes client IP addresses to pin repeated requests to designated nodes.',
  },
];

export default function StudioRightPanel() {
  const storeServers = useSimulationStore((state) => state.servers);
  const storeClients = useSimulationStore((state) => state.clients);
  const storeAlgorithm = useSimulationStore((state) => state.algorithm);
  const clusterMode = useSimulationStore((state) => state.clusterMode);
  const setClusterMode = useSimulationStore((state) => state.setClusterMode);
  const targetRps = useSimulationStore((state) => state.targetRps);
  const isRunning = useSimulationStore((state) => state.isRunning);
  const lbOnline = useSimulationStore((state) => state.lbOnline);
  const setTargetRps = useSimulationStore((state) => state.setTargetRps);
  const setAlgorithm = useSimulationStore((state) => state.setAlgorithm);
  const toggleSimulation = useSimulationStore((state) => state.toggleSimulation);
  const toggleServerStatus = useSimulationStore((state) => state.toggleServerStatus);
  const addServer = useSimulationStore((state) => state.addServer);
  const removeServer = useSimulationStore((state) => state.removeServer);

  // Remote Azure Gateway URL config
  const [gatewayUrlState, setGatewayUrlState] = useState(() => getGatewayUrl());
  const [editingGateway, setEditingGateway] = useState(false);
  const [gatewayDraft, setGatewayDraft] = useState(() => getGatewayUrl());

  // Browser Traffic Dispatcher state (replaces send_traffic.py CLI completely)
  const [reqCount, setReqCount] = useState(30);
  const [streamRate, setStreamRate] = useState(5);
  const [concurrency, setConcurrency] = useState(20);
  const [delaySec, setDelaySec] = useState(0);
  const [noLbTarget, setNoLbTarget] = useState('random');
  const [activeTask, setActiveTask] = useState(null); // null | 'stream' | 'burst' | 'stress' | 'overload' | 'no-lb' | 'with-lb' | 'demo' | 'probe'
  const [progress, setProgress] = useState({ completed: 0, total: 0, ok: 0, fail: 0 });
  const [dispatchLogs, setDispatchLogs] = useState([]);

  const abortCtrlRef = useRef(null);
  const logContainerRef = useRef(null);

  useEffect(() => {
    return subscribeGatewayChange((nextUrl) => {
      setGatewayUrlState(nextUrl);
      setGatewayDraft(nextUrl);
    });
  }, []);

  useEffect(() => {
    return () => {
      abortCtrlRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [dispatchLogs]);

  const appendLog = (entry) => {
    setDispatchLogs((prev) => [...prev.slice(-79), entry]);
  };

  const stopActiveTask = () => {
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    setActiveTask(null);
  };

  const startTask = (taskName, runner) => {
    stopActiveTask();
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;
    setActiveTask(taskName);
    setProgress({ completed: 0, total: 0, ok: 0, fail: 0 });

    Promise.resolve()
      .then(() => runner(ctrl.signal))
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          appendLog({
            id: `err-${Date.now()}`,
            level: 'error',
            text: `Task error: ${err?.message || 'Unexpected error'}`,
          });
        }
      })
      .finally(() => {
        if (abortCtrlRef.current === ctrl) {
          abortCtrlRef.current = null;
          setActiveTask(null);
        }
      });
  };

  const handleSaveGateway = (e) => {
    e.preventDefault();
    const saved = setGatewayUrl(gatewayDraft);
    setGatewayUrlState(saved);
    setEditingGateway(false);
    appendLog({
      id: `gw-save-${Date.now()}`,
      level: 'info',
      text: `[Gateway Updated] Remote LB endpoint set to ${saved}`,
    });
  };

  const handleResetGateway = () => {
    const def = resetGatewayUrl();
    setGatewayUrlState(def);
    setGatewayDraft(def);
    setEditingGateway(false);
    appendLog({
      id: `gw-reset-${Date.now()}`,
      level: 'info',
      text: `[Gateway Reset] Restored Azure LB-VM endpoint (${def})`,
    });
  };

  const parsedCount = Math.max(1, Math.min(2000, Number(reqCount) || 1));
  const parsedRate = Math.max(1, Math.min(50, Number(streamRate) || 1));
  const parsedConcurrency = Math.max(1, Math.min(60, Number(concurrency) || 10));
  const parsedDelay = Math.max(0, Math.min(5, Number(delaySec) || 0));

  const ALGO_MAP_TO_UI = {
    ROUND_ROBIN: 'ROUND ROBIN',
    LEAST_CONNECTIONS: 'LEAST CONN',
    IP_HASH: 'IP HASH',
    RANDOM: 'ROUND ROBIN',
    WEIGHTED_ROUND_ROBIN: 'ROUND ROBIN',
  };

  const ALGO_MAP_TO_STORE = {
    'ROUND ROBIN': 'ROUND_ROBIN',
    'LEAST CONN': 'LEAST_CONNECTIONS',
    'IP HASH': 'IP_HASH',
  };

  const servers = storeServers.map((s, idx) => ({
    ...s,
    name: s.name || `Azure VM ${idx + 1}`,
    ip: s.publicIp || s.ip || (s.url ? s.url.replace(/^https?:\/\//, '') : '52.172.229.225:5001'),
    publicIp:
      s.publicIp ||
      s.ip ||
      (s.url
        ? s.url.replace(/^https?:\/\//, '')
        : ['52.172.229.225:5001', '20.193.245.71:5001', '52.172.255.132:5001'][idx]),
    privateIp: s.privateIp || ['10.0.1.10', '10.0.1.11', '10.0.1.12'][idx] || `10.0.1.${10 + idx}`,
    cpu: Math.round(s.cpuUsage ?? s.cpu ?? 25),
    connections: s.activeConnections ?? s.connections ?? 0,
    healthy: s.status === 'healthy' || s.healthy === true,
  }));

  const healthyCount = servers.filter((s) => s.healthy).length;
  const currentAlgo = ALGO_MAP_TO_UI[storeAlgorithm] || 'ROUND ROBIN';
  const isPaused = !isRunning;

  const handleToggleServer = (idxOrId) => {
    const target = typeof idxOrId === 'number' ? servers[idxOrId] : servers.find((s) => s.id === idxOrId);
    if (target?.id) {
      toggleServerStatus(target.id);
    }
  };

  const handleAddServer = () => addServer();
  const handleRemoveServer = () => {
    if (servers.length > 1) removeServer(servers[servers.length - 1].id);
  };

  const handleAddClient = () => {
    const nextIdx = storeClients.length + 1;
    useSimulationStore.setState({
      clients: [
        ...storeClients,
        { id: `client-${Date.now()}`, name: `Client ${nextIdx}`, ip: `198.51.100.${10 + nextIdx}`, region: 'Global' },
      ],
    });
  };

  const handleRemoveClient = () => {
    if (storeClients.length > 1) {
      useSimulationStore.setState({ clients: storeClients.slice(0, -1) });
    }
  };

  const handleSetRps = (rps) => setTargetRps(rps);
  const handleSetAlgorithm = (algo) => setAlgorithm(ALGO_MAP_TO_STORE[algo] || algo);
  const handleTogglePause = () => toggleSimulation();

  const handleBurst = () => {
    if (!isRunning) toggleSimulation();
    for (let i = 0; i < 20; i++) {
      setTimeout(() => simulationEngine.dispatchRealRequest(), i * 25);
    }
  };

  const handleSendDummySingle = () => {
    simulationEngine.dispatchRealRequest();
  };

  const handleSendSingleLive = async () => {
    const clientIp = CLIENT_IPS[Math.floor(Math.random() * CLIENT_IPS.length)];
    await sendOne({
      url: gatewayUrlState,
      reqIdx: dispatchLogs.length + 1,
      clientIp,
      delay: parsedDelay,
      onLog: appendLog,
    });
  };

  const handleToggleStream = () => {
    if (activeTask === 'stream') {
      stopActiveTask();
      return;
    }
    startTask('stream', (signal) =>
      runContinuousStream({
        url: gatewayUrlState,
        rate: parsedRate,
        delay: parsedDelay,
        signal,
        onLog: appendLog,
        onProgress: setProgress,
      })
    );
  };

  const activeAlgoMeta = ALGORITHMS.find((a) => a.id === currentAlgo) || ALGORITHMS[0];

  return (
    <aside className="w-full flex flex-col gap-3.5 select-none pb-2 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',sans-serif]">
      {/* ================================================================
          1. APPLE HIG GROUPED SECTION: BACKEND NODES
         ================================================================ */}
      <div className="bg-white/80 dark:bg-[#1E1E1E]/90 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#007AFF]" />
            <h3 className="text-[12px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
              Backend Nodes
            </h3>
          </div>
          <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            {healthyCount} of {servers.length} online
          </span>
        </div>

        {/* Mode Toggle: Real-Time Azure VMs vs Dummy Simulation */}
        <div className="flex items-center justify-between p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setClusterMode('live')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              clusterMode === 'live'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <DuotoneIcon icon={Flash} size={13} className="text-amber-500" secondaryOpacity={0.3} />
            <span>Real-Time Azure</span>
          </button>
          <button
            type="button"
            onClick={() => setClusterMode('dummy')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              clusterMode === 'dummy'
                ? 'bg-white dark:bg-neutral-700 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <DuotoneIcon icon={Flask} size={13} className="text-purple-500" secondaryOpacity={0.3} />
            <span>Dummy Sim</span>
          </button>
        </div>

        {/* Server Cards List */}
        <div className="space-y-2">
          {servers.map((srv, idx) => (
            <ServerNodeCard
              key={srv.id || idx}
              server={srv}
              index={idx}
              onToggleHealth={handleToggleServer}
              defaultExpanded={idx === 0}
            />
          ))}
        </div>

        {/* Footer Stepper & Fleet Summary */}
        {clusterMode === 'dummy' ? (
          <div className="flex items-center justify-between pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08]">
            <span className="text-neutral-500 dark:text-neutral-400 text-[11px] font-normal">
              Simulation Pool: <strong className="text-neutral-900 dark:text-white font-medium">{servers.length}/5</strong>
            </span>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#2C2C2E] shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={handleRemoveServer}
                  disabled={servers.length <= 1}
                  className="w-7 h-7 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:bg-black/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
                  title="Remove Node"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <div className="w-[1px] h-3.5 bg-black/[0.08] dark:bg-white/[0.1]" />
                <button
                  type="button"
                  onClick={handleAddServer}
                  disabled={servers.length >= 5}
                  className="w-7 h-7 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:bg-black/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
                  title="Add Node"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddServer}
                disabled={servers.length >= 5}
                className="h-7 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#0062C4] text-white text-[12px] font-medium shadow-[0_1px_2px_rgba(0,122,255,0.2)] disabled:opacity-30 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>Add Node</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5">
              <DuotoneIcon icon={ShieldCheck} size={14} className="text-emerald-500" secondaryOpacity={0.25} />
              <span>Azure Central India Fleet</span>
            </span>
            <span className="font-mono text-neutral-600 dark:text-neutral-300">
              {servers.length} Dedicated VMs
            </span>
          </div>
        )}
      </div>

      {/* ================================================================
          2. BROWSER TRAFFIC DISPATCHER (LIVE AZURE) / DUMMY CONTROLS
         ================================================================ */}
      {clusterMode === 'live' ? (
        <div className="bg-white/80 dark:bg-[#1E1E1E]/90 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] space-y-3.5">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.05] dark:border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <DuotoneIcon icon={Flash} size={15} className="text-[#007AFF]" secondaryOpacity={0.26} />
              <h3 className="text-[12px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Browser Traffic Dispatcher
              </h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                lbOnline
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
              }`}
            >
              {activeTask ? `Running: ${activeTask}` : lbOnline ? 'LB Online' : 'Gateway Poll'}
            </span>
          </div>

          {/* Remote Online Azure LB-VM Endpoint Box */}
          <div className="rounded-xl bg-black/[0.025] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.07] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <DuotoneIcon icon={Globe} size={13} className="text-blue-500" secondaryOpacity={0.22} />
                <span className="text-[11px] font-mono text-neutral-700 dark:text-neutral-200 truncate">
                  {getGatewayHost(gatewayUrlState)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingGateway((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
                title="Configure online Azure LB-VM URL"
              >
                <Setting2 size={11} />
                <span>{editingGateway ? 'Close' : 'Edit VM'}</span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {editingGateway && (
                <motion.form
                  key="panel-gateway-edit"
                  initial={{ height: 0, opacity: 0, y: -4, filter: 'blur(3px)' }}
                  animate={{ height: 'auto', opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ height: 0, opacity: 0, y: -4, filter: 'blur(3px)' }}
                  transition={{ height: { type: 'spring', stiffness: 310, damping: 28 }, opacity: { duration: 0.16 } }}
                  onSubmit={handleSaveGateway}
                  className="overflow-hidden"
                >
                  <div className="mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.06] space-y-2">
                    <input
                      type="text"
                      value={gatewayDraft}
                      onChange={(e) => setGatewayDraft(e.target.value)}
                      placeholder="http://20.244.34.101:5000"
                      className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-[#141416] border border-black/[0.1] dark:border-white/[0.12] text-[11px] font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={handleResetGateway}
                        className="px-2 py-1 rounded-md text-[10px] font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                      >
                        Default LB-VM
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#007AFF] hover:bg-[#0071E3] text-white cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Balancing Strategy Selector (synced with remote /api/algorithm) */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400 font-normal">
                Routing Algorithm
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                Live L7 Balancer
              </span>
            </div>
            <div className="p-0.5 rounded-[9px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center">
              {ALGORITHMS.map((algo) => {
                const isActive = currentAlgo === algo.id;
                return (
                  <button
                    key={algo.id}
                    type="button"
                    onClick={() => handleSetAlgorithm(algo.id)}
                    className={`flex-1 h-7 px-1 rounded-[7px] text-[11px] font-sans transition-all text-center truncate flex items-center justify-center cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#323234] text-neutral-900 dark:text-white font-semibold shadow-[0_1px_2.5px_rgba(0,0,0,0.1),0_0.5px_1px_rgba(0,0,0,0.06)]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {algo.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Request Count + Rate + Concurrency + Delay Inputs */}
          <div className="rounded-xl bg-black/[0.025] dark:bg-white/[0.035] border border-black/[0.05] dark:border-white/[0.06] p-3 space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="req-count-input" className="text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                  Requests to Send
                </label>
                <div className="flex items-center gap-1">
                  {REQ_COUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReqCount(preset)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                        Number(reqCount) === preset
                          ? 'bg-[#007AFF] text-white font-semibold'
                          : 'bg-black/[0.05] dark:bg-white/[0.08] text-neutral-500 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="req-count-input"
                type="number"
                min={1}
                max={2000}
                value={reqCount}
                onChange={(e) => setReqCount(e.target.value)}
                placeholder="Enter number of requests"
                className="w-full h-8.5 px-2.5 rounded-lg bg-white dark:bg-[#141416] border border-black/[0.1] dark:border-white/[0.12] text-xs font-mono font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="stream-rate-input" className="block text-[10px] text-neutral-500 dark:text-neutral-400 mb-1">
                  Rate (req/s)
                </label>
                <input
                  id="stream-rate-input"
                  type="number"
                  min={1}
                  max={50}
                  value={streamRate}
                  onChange={(e) => setStreamRate(e.target.value)}
                  className="w-full h-7.5 px-2 rounded-lg bg-white dark:bg-[#141416] border border-black/[0.1] dark:border-white/[0.12] text-[11px] font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                />
              </div>

              <div>
                <label htmlFor="concurrency-input" className="block text-[10px] text-neutral-500 dark:text-neutral-400 mb-1">
                  Concurrency
                </label>
                <input
                  id="concurrency-input"
                  type="number"
                  min={1}
                  max={60}
                  value={concurrency}
                  onChange={(e) => setConcurrency(e.target.value)}
                  className="w-full h-7.5 px-2 rounded-lg bg-white dark:bg-[#141416] border border-black/[0.1] dark:border-white/[0.12] text-[11px] font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                />
              </div>

              <div>
                <label htmlFor="delay-sec-input" className="block text-[10px] text-neutral-500 dark:text-neutral-400 mb-1">
                  Delay (sec)
                </label>
                <input
                  id="delay-sec-input"
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={delaySec}
                  onChange={(e) => setDelaySec(e.target.value)}
                  className="w-full h-7.5 px-2 rounded-lg bg-white dark:bg-[#141416] border border-black/[0.1] dark:border-white/[0.12] text-[11px] font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
                />
              </div>
            </div>
          </div>

          {/* Primary Dispatch Actions */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={Boolean(activeTask)}
              onClick={() =>
                startTask('burst', (signal) =>
                  runStressTest({
                    url: gatewayUrlState,
                    count: parsedCount,
                    concurrency: Math.min(parsedConcurrency, parsedCount),
                    delay: parsedDelay,
                    label: 'BURST WAVE',
                    signal,
                    onLog: appendLog,
                    onProgress: setProgress,
                  })
                )
              }
              className="h-8.5 px-2 rounded-xl bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#0062C4] disabled:opacity-45 text-white text-[11px] font-medium shadow-[0_1px_2px_rgba(0,122,255,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer"
              title={`Send ${parsedCount} requests to the remote Load Balancer`}
            >
              <Flash size={13} weight="Filled" />
              <span className="truncate">Send {parsedCount}</span>
            </button>

            <button
              type="button"
              disabled={Boolean(activeTask && activeTask !== 'stream')}
              onClick={handleToggleStream}
              className={`h-8.5 px-2 rounded-xl text-[11px] font-medium border transition-all active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-45 ${
                activeTask === 'stream'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500'
                  : 'bg-white dark:bg-[#2C2C2E] hover:bg-neutral-50 dark:hover:bg-[#343436] text-neutral-800 dark:text-neutral-100 border-black/[0.08] dark:border-white/[0.1]'
              }`}
              title={`Stream continuous HTTP requests @ ${parsedRate}/s`}
            >
              {activeTask === 'stream' ? <Stop size={13} weight="Filled" /> : <Play size={13} />}
              <span>{activeTask === 'stream' ? 'Stop' : `Stream ${parsedRate}/s`}</span>
            </button>

            <button
              type="button"
              disabled={Boolean(activeTask)}
              onClick={handleSendSingleLive}
              className="h-8.5 px-2 rounded-xl bg-white dark:bg-[#2C2C2E] hover:bg-neutral-50 dark:hover:bg-[#343436] disabled:opacity-45 border border-black/[0.08] dark:border-white/[0.1] text-neutral-800 dark:text-neutral-100 text-[11px] font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer"
              title="Send 1 live HTTP request"
            >
              <ArrowRight size={13} className="text-[#007AFF]" />
              <span>1 Req</span>
            </button>
          </div>

          {/* Full Scenario Suite (replaces every CLI flag cleanly) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                Browser Scenario Suite
              </span>
              <SmoothDropdown
                value={noLbTarget}
                onChange={setNoLbTarget}
                ariaLabel="Target VM for No-LB attack"
                align="right"
                placement="auto"
                size="xs"
                options={[
                  { value: 'random', label: 'No-LB: Random VM' },
                  ...servers.map((s) => ({ value: s.id, label: `No-LB: ${s.name}` })),
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={Boolean(activeTask)}
                onClick={() =>
                  startTask('stress', (signal) =>
                    runStressTest({
                      url: gatewayUrlState,
                      count: parsedCount,
                      concurrency: parsedConcurrency,
                      delay: parsedDelay,
                      label: 'STRESS TEST',
                      signal,
                      onLog: appendLog,
                      onProgress: setProgress,
                    })
                  )
                }
                className="h-8 px-2.5 rounded-xl bg-black/[0.035] hover:bg-black/[0.065] dark:bg-white/[0.05] dark:hover:bg-white/[0.09] disabled:opacity-45 border border-black/[0.05] dark:border-white/[0.08] text-[11px] font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <DuotoneIcon icon={Activity} size={13} className="text-blue-500" secondaryOpacity={0.25} />
                <span className="truncate">Stress Test</span>
              </button>

              <button
                type="button"
                disabled={Boolean(activeTask)}
                onClick={() =>
                  startTask('overload', (signal) =>
                    runOverloadCrashTest({
                      url: gatewayUrlState,
                      count: Math.max(30, parsedCount),
                      concurrency: Math.max(parsedConcurrency, 35),
                      delay: Math.max(parsedDelay, 1.5),
                      signal,
                      onLog: appendLog,
                      onProgress: setProgress,
                    })
                  )
                }
                className="h-8 px-2.5 rounded-xl bg-amber-500/[0.08] hover:bg-amber-500/[0.15] disabled:opacity-45 border border-amber-500/25 text-[11px] font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <DuotoneIcon icon={AlertTriangle} size={13} secondaryOpacity={0.26} />
                <span className="truncate">Overload Crash</span>
              </button>

              <button
                type="button"
                disabled={Boolean(activeTask)}
                onClick={() =>
                  startTask('no-lb', (signal) =>
                    runNoLbCrashTest({
                      targetServer: noLbTarget === 'random' ? null : noLbTarget,
                      count: Math.max(25, parsedCount),
                      concurrency: Math.max(parsedConcurrency, 20),
                      signal,
                      onLog: appendLog,
                      onProgress: setProgress,
                    })
                  )
                }
                className="h-8 px-2.5 rounded-xl bg-rose-500/[0.08] hover:bg-rose-500/[0.15] disabled:opacity-45 border border-rose-500/25 text-[11px] font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <DuotoneIcon icon={ShieldAlert} size={13} secondaryOpacity={0.26} />
                <span className="truncate">No-LB Attack</span>
              </button>

              <button
                type="button"
                disabled={Boolean(activeTask)}
                onClick={() =>
                  startTask('with-lb', (signal) =>
                    runWithLbSurvivalTest({
                      url: gatewayUrlState,
                      count: Math.max(25, parsedCount),
                      concurrency: Math.max(parsedConcurrency, 20),
                      signal,
                      onLog: appendLog,
                      onProgress: setProgress,
                    })
                  )
                }
                className="h-8 px-2.5 rounded-xl bg-emerald-500/[0.08] hover:bg-emerald-500/[0.15] disabled:opacity-45 border border-emerald-500/25 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <DuotoneIcon icon={ShieldCheck} size={13} secondaryOpacity={0.26} />
                <span className="truncate">With-LB Protect</span>
              </button>

              <button
                type="button"
                disabled={Boolean(activeTask)}
                onClick={() =>
                  startTask('demo', (signal) =>
                    runShowcaseDemo({
                      url: gatewayUrlState,
                      signal,
                      onLog: appendLog,
                      onProgress: setProgress,
                    })
                  )
                }
                className="h-8 px-2.5 rounded-xl bg-indigo-500/[0.08] hover:bg-indigo-500/[0.15] disabled:opacity-45 border border-indigo-500/25 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <DuotoneIcon icon={Play} size={13} secondaryOpacity={0.26} />
                <span className="truncate">4-Act Demo</span>
              </button>

              <button
                type="button"
                disabled={Boolean(activeTask)}
                onClick={() =>
                  startTask('probe', (signal) =>
                    probeDirectVms({
                      url: gatewayUrlState,
                      signal,
                      onLog: appendLog,
                    })
                  )
                }
                className="h-8 px-2.5 rounded-xl bg-black/[0.035] hover:bg-black/[0.065] dark:bg-white/[0.05] dark:hover:bg-white/[0.09] disabled:opacity-45 border border-black/[0.05] dark:border-white/[0.08] text-[11px] font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <DuotoneIcon icon={Server} size={13} className="text-sky-500" secondaryOpacity={0.25} />
                <span className="truncate">Probe VMs</span>
              </button>
            </div>
          </div>

          {/* Cluster Restore / Stats / Abort Row */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => restoreAllApi(gatewayUrlState, { onLog: appendLog })}
              className="flex-1 h-7.5 px-2.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <CheckCircle size={13} />
              <span>Restore Fleet</span>
            </button>

            <button
              type="button"
              onClick={() => fetchStatsApi(gatewayUrlState, { onLog: appendLog })}
              className="flex-1 h-7.5 px-2.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-medium text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <ChartBar size={13} />
              <span>LB Stats</span>
            </button>

            {activeTask && (
              <button
                type="button"
                onClick={stopActiveTask}
                className="h-7.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Stop size={12} weight="Filled" />
                <span>Stop</span>
              </button>
            )}
          </div>

          {/* Live Browser Dispatch Telemetry & Log Console */}
          <div className="rounded-xl bg-[#111216] border border-black/15 dark:border-white/[0.09] overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/[0.07] text-[10px] font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="text-neutral-200 font-semibold">Live Dispatch Log</span>
                {progress.completed > 0 && (
                  <span className="text-neutral-400 tabular-nums">
                    {progress.completed}
                    {progress.total ? `/${progress.total}` : ''} ·{' '}
                    <span className="text-emerald-400">{progress.ok} ok</span>
                    {progress.fail > 0 && (
                      <span className="text-rose-400"> · {progress.fail} err</span>
                    )}
                  </span>
                )}
              </div>
              {dispatchLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDispatchLogs([])}
                  className="inline-flex items-center gap-1 text-neutral-400 hover:text-white cursor-pointer"
                  title="Clear log output"
                >
                  <Trash size={11} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div
              ref={logContainerRef}
              className="h-36 overflow-y-auto p-2.5 space-y-1 font-mono text-[10px] leading-relaxed"
            >
              {dispatchLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-neutral-500 px-3">
                  Enter how many requests above and click Send, Stream, Stress Test, or Probe VMs to dispatch live from the browser.
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
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-[#1E1E1E]/90 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] space-y-3.5">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-1.5">
              <Slider className="w-3.5 h-3.5 text-[#007AFF]" />
              <h3 className="text-[12px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Traffic & Dispatch
              </h3>
            </div>
            <span className="text-[11px] font-medium text-[#007AFF] dark:text-[#0A84FF]">
              {activeAlgoMeta.tag}
            </span>
          </div>

          {/* Apple HIG Segmented Control: Ingress Rate */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400 font-normal">
                Ingress Target
              </span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                {targetRps.toLocaleString()} req/s
              </span>
            </div>
            <div className="p-0.5 rounded-[9px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center">
              {RPS_LEVELS.map(({ val, label }) => {
                const isActive = targetRps === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSetRps(val)}
                    className={`flex-1 h-7 rounded-[7px] text-[11.5px] font-mono transition-all text-center flex items-center justify-center cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#323234] text-neutral-900 dark:text-white font-semibold shadow-[0_1px_2.5px_rgba(0,0,0,0.1),0_0.5px_1px_rgba(0,0,0,0.06)]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Apple HIG Segmented Control: Balancing Strategy */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400 font-normal">
                Balancing Strategy
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                Layer 7
              </span>
            </div>
            <div className="p-0.5 rounded-[9px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center">
              {ALGORITHMS.map((algo) => {
                const isActive = currentAlgo === algo.id;
                return (
                  <button
                    key={algo.id}
                    type="button"
                    onClick={() => handleSetAlgorithm(algo.id)}
                    className={`flex-1 h-7 px-1 rounded-[7px] text-[11.5px] font-sans transition-all text-center truncate flex items-center justify-center cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#323234] text-neutral-900 dark:text-white font-semibold shadow-[0_1px_2.5px_rgba(0,0,0,0.1),0_0.5px_1px_rgba(0,0,0,0.06)]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {algo.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 leading-snug">
              {activeAlgoMeta.desc}
            </p>
          </div>

          {/* Apple HIG Inset Group Row: Clients Stepper */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.025] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]">
            <div>
              <div className="text-[10.5px] font-medium text-neutral-400 dark:text-neutral-500 leading-none">
                Traffic Generators
              </div>
              <div className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
                {storeClients.length} Active Clients
              </div>
            </div>
            <div className="inline-flex items-center rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#2C2C2E] shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={handleRemoveClient}
                disabled={storeClients.length <= 1}
                className="w-7 h-7 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:bg-black/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
                title="Remove Client"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-black/[0.08] dark:bg-white/[0.1]" />
              <button
                type="button"
                onClick={handleAddClient}
                disabled={storeClients.length >= 6}
                className="w-7 h-7 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:bg-black/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
                title="Add Client"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Action Console */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={handleBurst}
              className="h-8.5 rounded-xl bg-[#FF9500] hover:bg-[#F28C00] active:bg-[#D97D00] text-white text-[12px] font-sans font-medium shadow-[0_1px_2px_rgba(255,149,0,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              title="Trigger synchronized traffic burst across all clients"
            >
              <Flash className="w-3.5 h-3.5 fill-current" />
              <span>Surge</span>
            </button>

            <button
              type="button"
              onClick={handleTogglePause}
              className={`h-8.5 rounded-xl text-[12px] font-sans font-medium shadow-2xs border transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer ${
                isPaused
                  ? 'bg-[#34C759]/10 text-[#248A3D] dark:text-[#30D158] border-[#34C759]/30 hover:bg-[#34C759]/15'
                  : 'bg-white dark:bg-[#2C2C2E] border-black/[0.08] dark:border-white/[0.1] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-[#343436]'
              }`}
              title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-[#34C759]" /> : <Pause className="w-3.5 h-3.5 text-neutral-500" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendDummySingle}
              className="h-8.5 rounded-xl bg-white dark:bg-[#2C2C2E] hover:bg-neutral-50 dark:hover:bg-[#343436] border border-black/[0.08] dark:border-white/[0.1] text-neutral-800 dark:text-neutral-200 text-[12px] font-sans font-medium shadow-2xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              title="Inject single test packet"
            >
              <ArrowRight className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Inject</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
