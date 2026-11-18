import React from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { useServers } from '../../hooks/useServers';
import { ALGORITHM_INFO } from '../../simulation/loadBalancingAlgorithms';
import {
  Server,
  Shield,
  Globe,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Layers,
  Power,
  AlertTriangle,
  RefreshCw,
  X,
  CheckCircle2,
  XCircle,
  Sliders
} from 'lucide-react';
import { formatPercent, formatMs, formatNumber } from '../../utils/formatters';

export default function InspectorPanel({ onClose }) {
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const servers = useSimulationStore((state) => state.servers);
  const clients = useSimulationStore((state) => state.clients);
  const algorithm = useSimulationStore((state) => state.algorithm);
  const setAlgorithm = useSimulationStore((state) => state.setAlgorithm);
  const metrics = useSimulationStore((state) => state.metrics);
  const { toggleServerStatus, failServer, recoverServer, updateServerWeight } = useServers();

  // Find server if selected
  const activeServer = selectedNode?.type === 'server'
    ? servers.find((s) => s.id === selectedNode.id)
    : null;

  // Find client if selected
  const activeClient = selectedNode?.type === 'client'
    ? clients.find((c) => c.id === selectedNode.id)
    : null;

  const isLb = selectedNode?.type === 'lb';

  return (
    <div className="w-80 bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-2xl p-5 shadow-card flex flex-col h-full max-h-[620px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-cream-200 dark:border-charcoal-700">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-sage-100 dark:bg-sage-950/40 text-sage-600 dark:text-sage-400 flex items-center justify-center">
            {isLb && <Shield className="w-3.5 h-3.5" />}
            {activeServer && <Server className="w-3.5 h-3.5" />}
            {activeClient && <Globe className="w-3.5 h-3.5" />}
            {!selectedNode && <Activity className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500 dark:text-cream-400">
            Inspector
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-200 dark:hover:bg-charcoal-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* A. SERVER INSPECTION */}
      {activeServer && (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-charcoal-800 dark:text-cream-100">
                {activeServer.name}
              </h3>
              <p className="text-xs font-mono text-charcoal-400">{activeServer.ip}</p>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider ${
                activeServer.status === 'healthy'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : activeServer.status === 'degraded'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {activeServer.status}
            </span>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
              <span className="text-charcoal-400 flex items-center gap-1 text-[11px] mb-1">
                <Cpu className="w-3 h-3" /> CPU Load
              </span>
              <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                {formatPercent(activeServer.cpu)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
              <span className="text-charcoal-400 flex items-center gap-1 text-[11px] mb-1">
                <HardDrive className="w-3 h-3" /> RAM Usage
              </span>
              <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                {formatPercent(activeServer.memory)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
              <span className="text-charcoal-400 flex items-center gap-1 text-[11px] mb-1">
                <Layers className="w-3 h-3" /> Active Conns
              </span>
              <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                {activeServer.activeConnections}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
              <span className="text-charcoal-400 flex items-center gap-1 text-[11px] mb-1">
                <Clock className="w-3 h-3" /> Latency
              </span>
              <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                {formatMs(activeServer.avgLatency)}
              </span>
            </div>
          </div>

          {/* Request counts */}
          <div className="p-3 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-charcoal-400">Total Requests Handled:</span>
              <span className="font-mono font-bold text-charcoal-800 dark:text-cream-100">
                {formatNumber(activeServer.totalRequests)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-400">Successful (2xx):</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                {formatNumber(activeServer.successfulRequests)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-400">Failed / Errors:</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">
                {formatNumber(activeServer.failedRequests)}
              </span>
            </div>
          </div>

          {/* Weight Slider */}
          <div className="p-3 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-charcoal-500 font-medium flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Traffic Weight
              </span>
              <span className="font-mono font-bold text-sage-600">{activeServer.weight}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={activeServer.weight}
              onChange={(e) => updateServerWeight(activeServer.id, parseInt(e.target.value))}
              className="w-full accent-sage-600 cursor-pointer"
            />
            <p className="text-[10px] text-charcoal-400 mt-1">
              Affects distribution when Weighted Round Robin is active.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider block">
              Node Actions
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => toggleServerStatus(activeServer.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border ${
                  activeServer.status === 'disabled'
                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                    : 'bg-cream-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-cream-200 border-cream-300 hover:bg-cream-300'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {activeServer.status === 'disabled' ? 'Enable' : 'Disable'}
              </button>

              {activeServer.status === 'failed' ? (
                <button
                  onClick={() => recoverServer(activeServer.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Recover
                </button>
              ) : (
                <button
                  onClick={() => failServer(activeServer.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Crash Node
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* B. LOAD BALANCER INSPECTION */}
      {isLb && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-charcoal-800 dark:text-cream-100">
              Virtual Load Balancer
            </h3>
            <p className="text-xs font-mono text-charcoal-400">VIP: 10.0.0.1:443 (Active)</p>
          </div>

          {/* Algorithm Selector */}
          <div>
            <label className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider block mb-1.5">
              Balancing Strategy
            </label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full bg-cream-100 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 rounded-xl px-3 py-2 text-xs font-medium text-charcoal-800 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
            >
              {Object.keys(ALGORITHM_INFO).map((key) => (
                <option key={key} value={key}>
                  {ALGORITHM_INFO[key].name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-charcoal-400 mt-1.5 leading-relaxed">
              {ALGORITHM_INFO[algorithm].description}
            </p>
          </div>

          {/* Cluster Throughput Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
              <span className="text-charcoal-400 block text-[11px] mb-1">Total Throughput</span>
              <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                {formatNumber(metrics.totalRequests)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
              <span className="text-charcoal-400 block text-[11px] mb-1">Current Rate</span>
              <span className="text-sm font-bold font-mono text-sage-600">
                {metrics.currentRps} req/s
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
              <span className="text-charcoal-400 block text-[11px] mb-1">Cluster Latency</span>
              <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                {formatMs(metrics.avgLatency)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
              <span className="text-charcoal-400 block text-[11px] mb-1">Active Targets</span>
              <span className="text-sm font-bold font-mono text-emerald-600">
                {servers.filter((s) => s.status === 'healthy').length} / {servers.length}
              </span>
            </div>
          </div>

          {/* Distribution Breakdown by Server */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider block">
              Traffic Distribution
            </span>
            <div className="space-y-1.5">
              {servers.map((s) => {
                const total = metrics.totalRequests || 1;
                const pct = Math.round((s.totalRequests / total) * 100);
                return (
                  <div key={s.id} className="text-xs">
                    <div className="flex justify-between text-[11px] text-charcoal-600 dark:text-cream-300 mb-0.5">
                      <span>{s.name}</span>
                      <span className="font-mono">{pct}% ({s.totalRequests})</span>
                    </div>
                    <div className="w-full bg-cream-200 dark:bg-charcoal-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sage-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* C. CLIENT INSPECTION */}
      {activeClient && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-charcoal-800 dark:text-cream-100">
              {activeClient.name}
            </h3>
            <p className="text-xs font-mono text-charcoal-400">{activeClient.ip}</p>
          </div>

          <div className="p-3 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-charcoal-400">Origin Region:</span>
              <span className="font-semibold text-charcoal-800 dark:text-cream-100">{activeClient.region}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-400">Client Agent:</span>
              <span className="text-charcoal-700 dark:text-cream-300">{activeClient.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-400">Connection:</span>
              <span className="text-emerald-600 font-medium">Keep-Alive (TLS 1.3)</span>
            </div>
          </div>
        </div>
      )}

      {/* D. GENERAL OVERVIEW WHEN NOTHING SELECTED */}
      {!activeServer && !isLb && !activeClient && (
        <div className="space-y-4 text-xs text-charcoal-500">
          <p>
            Click any client node, load balancer, or backend server to inspect live telemetry and controls.
          </p>
          <div className="p-3 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700 space-y-1.5">
            <span className="font-bold text-charcoal-800 dark:text-cream-100 block mb-1">
              Cluster Summary
            </span>
            <div className="flex justify-between">
              <span>Nodes Online:</span>
              <span className="font-mono text-emerald-600 font-bold">
                {servers.filter((s) => s.status === 'healthy').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Current Algorithm:</span>
              <span className="font-mono text-charcoal-700 dark:text-cream-300">
                {algorithm.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Requests:</span>
              <span className="font-mono font-bold text-charcoal-800 dark:text-cream-100">
                {formatNumber(metrics.totalRequests)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
