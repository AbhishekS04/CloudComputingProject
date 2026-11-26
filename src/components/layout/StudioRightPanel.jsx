import React, { useState, useEffect } from 'react';
import ServerNodeCard from '../ui/ServerNodeCard';
import { useSimulationStore } from '../../store/simulationStore';
import { simulationEngine } from '../../simulation/engine';

const IS_LIVE_BACKEND = true;
import {
  Server,
  Slider,
  Flash,
  Play,
  Pause,
  Plus,
  Minus,
  ArrowRight,
  BrowserTerminal,
  Copy,
  Check,
  ShieldCheck,
} from 'reicon-react';
import { DuotoneIcon } from '../ui/DuotoneIcon';

const RPS_LEVELS = [
  { val: 12, label: '12/s' },
  { val: 45, label: '45/s' },
  { val: 180, label: '180/s' },
  { val: 1000, label: '1K/s' },
  { val: 5000, label: '5K/s' },
];

const ALGORITHMS = [
  {
    id: 'ROUND ROBIN',
    label: 'Round Robin',
    tag: 'Cyclic',
    desc: 'Sequentially distributes traffic across active nodes in fixed rotation.'
  },
  {
    id: 'LEAST CONN',
    label: 'Least Conn',
    tag: 'Load-Aware',
    desc: 'Dispatches requests to the node with fewest active TCP sockets.'
  },
  {
    id: 'IP HASH',
    label: 'IP Hash',
    tag: 'Deterministic',
    desc: 'Hashes client IP addresses to pin repeated requests to designated nodes.'
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
  const setTargetRps = useSimulationStore((state) => state.setTargetRps);
  const setAlgorithm = useSimulationStore((state) => state.setAlgorithm);
  const toggleSimulation = useSimulationStore((state) => state.toggleSimulation);
  const toggleServerStatus = useSimulationStore((state) => state.toggleServerStatus);
  const addServer = useSimulationStore((state) => state.addServer);
  const removeServer = useSimulationStore((state) => state.removeServer);
  const metrics = useSimulationStore((state) => state.metrics);
  const [copiedCmd, setCopiedCmd] = useState(null);

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
    ip: s.publicIp || s.ip || (s.url ? s.url.replace(/^https?:\/\//, "") : "52.172.229.225:5001"),
    publicIp: s.publicIp || s.ip || (s.url ? s.url.replace(/^https?:\/\//, "") : ["52.172.229.225:5001", "20.193.245.71:5001", "52.172.255.132:5001"][idx]),
    privateIp: s.privateIp || ["10.0.1.10", "10.0.1.11", "10.0.1.12"][idx] || `10.0.1.${10 + idx}`,
    cpu: Math.round(s.cpuUsage ?? s.cpu ?? 25),
    connections: s.activeConnections ?? s.connections ?? 0,
    healthy: s.status === 'healthy' || s.healthy === true,
  }));

  const clients = storeClients.map((c, idx) => ({
    ...c,
    label: c.name || `Client ${idx + 1}`,
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

  const handleSendRequest = () => {
    simulationEngine.dispatchRealRequest();
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
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              clusterMode === 'live'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Real-Time Azure
          </button>
          <button
            type="button"
            onClick={() => setClusterMode('dummy')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              clusterMode === 'dummy'
                ? 'bg-white dark:bg-neutral-700 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Dummy Sim
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

        {/* Apple HIG Footer Stepper & Action */}
        {clusterMode === 'dummy' ? (
          <div className="flex items-center justify-between pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08]">
            <span className="text-neutral-500 dark:text-neutral-400 text-[11px] font-normal">
              Simulation Pool: <strong className="text-neutral-900 dark:text-white font-medium">{servers.length}/5</strong>
            </span>
            <div className="flex items-center gap-2">
              {/* Integrated Apple Stepper */}
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

              {/* Apple Accent Action Button */}
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
              3 Dedicated VMs (Standard B2s)
            </span>
          </div>
        )}
      </div>

      {/* ================================================================
          2. APPLE HIG GROUPED SECTION: TRAFFIC & DISPATCH / LIVE AZURE
         ================================================================ */}
      {clusterMode === 'live' ? (
        <div className="bg-white/80 dark:bg-[#1E1E1E]/90 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] space-y-3.5">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-1 border-b border-black/[0.05] dark:border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <DuotoneIcon icon={BrowserTerminal} size={15} className="text-[#007AFF]" secondaryOpacity={0.22} />
              <h3 className="text-[12px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Terminal Traffic Controller
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/25">
              CLI Driven
            </span>
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            All packets are driven from your terminal to the real Azure cluster. Synthetic browser requests are disabled.
          </p>

          {/* Balancing Strategy Selector (Layer 7 Control synced with /api/algorithm) */}
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

          {/* Interactive Terminal Commands */}
          <div className="space-y-2">
            <div className="text-[10.5px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
              Terminal Traffic Commands
            </div>

            {[
              {
                label: 'Continuous Stream (5 req/s)',
                cmd: 'python send_traffic.py --rate 5',
                desc: 'Streams live packets evenly across active Azure nodes'
              },
              {
                label: 'Burst Wave (30 requests)',
                cmd: 'python send_traffic.py --burst 30',
                desc: 'Fires 30 concurrent packets across the network'
              },
              {
                label: 'Stress Load / Concurrency Test',
                cmd: 'python send_traffic.py --stress',
                desc: 'Floods cluster with concurrent threads to test capacity'
              },
              {
                label: 'Without LB Attack (Crash Single VM)',
                cmd: 'python send_traffic.py --no-lb',
                desc: 'Sends traffic directly to 1 random VM (LB OFF) -> crashes VM!'
              },
              {
                label: 'With LB Protection (Zero Crash)',
                cmd: 'python send_traffic.py --with-lb',
                desc: 'Sends identical flood via LB across all 3 VMs -> 100% survival!'
              },
              {
                label: 'Overload Crash & Failover Test',
                cmd: 'python send_traffic.py --overload',
                desc: 'Overloads nodes to trigger crash + smooth failover shift'
              },
              {
                label: 'Faculty Presentation Demo (Full)',
                cmd: 'python send_traffic.py --demo --auto',
                desc: 'Automated 4-act live showcase for Azure audit, traffic, crash & recovery'
              },
              {
                label: 'Direct Azure VM Probe',
                cmd: 'python send_traffic.py --direct',
                desc: 'Inspects health & request counters on all 3 Azure VMs'
              }
            ].map(({ label, cmd, desc }) => (
              <div
                key={cmd}
                className="group relative p-2.5 rounded-xl bg-black/[0.025] dark:bg-white/[0.035] border border-black/[0.05] dark:border-white/[0.06] hover:border-[#007AFF]/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(cmd);
                      setCopiedCmd(cmd);
                      setTimeout(() => setCopiedCmd(null), 2000);
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-500 hover:text-[#007AFF] bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] shadow-2xs transition-colors cursor-pointer"
                    title="Copy command to clipboard"
                  >
                    {copiedCmd === cmd ? (
                      <>
                        <Check size={11} className="text-[#34C759]" />
                        <span className="text-[#34C759]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[10.5px] text-[#007AFF] dark:text-[#0A84FF] select-all truncate bg-white/60 dark:bg-black/30 px-2 py-1 rounded border border-black/[0.03] dark:border-white/[0.05]">
                  {cmd}
                </div>
                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                  {desc}
                </div>
              </div>
            ))}
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
                {clients.length} Active Clients
              </div>
            </div>
            {/* Integrated Stepper */}
            <div className="inline-flex items-center rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#2C2C2E] shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={handleRemoveClient}
                disabled={clients.length <= 1}
                className="w-7 h-7 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:bg-black/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
                title="Remove Client"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-black/[0.08] dark:bg-white/[0.1]" />
              <button
                type="button"
                onClick={handleAddClient}
                disabled={clients.length >= 6}
                className="w-7 h-7 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:bg-black/[0.06] disabled:opacity-30 transition-colors cursor-pointer"
                title="Add Client"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Apple HIG Native Action Console */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Surge Button (Apple System Orange) */}
            <button
              type="button"
              onClick={handleBurst}
              className="h-8.5 rounded-xl bg-[#FF9500] hover:bg-[#F28C00] active:bg-[#D97D00] text-white text-[12px] font-sans font-medium shadow-[0_1px_2px_rgba(255,149,0,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              title="Trigger synchronized traffic burst across all clients"
            >
              <Flash className="w-3.5 h-3.5 fill-current" />
              <span>Surge</span>
            </button>

            {/* Pause / Resume Button (Apple Elevated Glass) */}
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

            {/* Inject Packet Button (Apple System Button) */}
            <button
              type="button"
              onClick={handleSendRequest}
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



