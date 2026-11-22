import React, { useState } from 'react';
import { useServers } from '../hooks/useServers';
import { useSimulationStore } from '../store/simulationStore';
import {
  Server,
  Plus,
  Trash,
  Power,
  AlertTriangle,
  Refresh,
  Cpu,
  HardDrive,
  Slider,
  CheckCircle,
  XCircle,
  X
} from 'reicon-react';
import { formatPercent, formatMs, formatNumber } from '../utils/formatters';

const IS_LIVE_BACKEND = Boolean(import.meta.env.VITE_API_BASE_URL);

export default function ServersPage() {
  const {
    servers,
    addServer,
    removeServer,
    toggleServerStatus,
    failServer,
    recoverServer,
    updateServerWeight
  } = useServers();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerWeight, setNewServerWeight] = useState(2);

  const handleCreateServer = (e) => {
    e.preventDefault();
    addServer({
      name: newServerName.trim() || undefined,
      weight: newServerWeight
    });
    setNewServerName('');
    setNewServerWeight(2);
    setAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-cream-50 dark:bg-charcoal-800 p-5 rounded-2xl border border-cream-300 dark:border-charcoal-700 shadow-card">
        <div>
          <h2 className="text-lg font-bold text-charcoal-900 dark:text-cream-100">
            Backend Server Fleet
          </h2>
          <p className="text-xs text-charcoal-500 dark:text-cream-400">
            Configure server capacity, weights, operational status, and fault injection
          </p>
        </div>

        {!IS_LIVE_BACKEND ? (
          <button
            onClick={() => setAddModalOpen(true)}
            disabled={servers.length >= 8}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white text-xs font-semibold shadow-subtle transition-all"
          >
            <Plus aria-hidden="true" size={16} />
            <span>Provision New Node</span>
          </button>
        ) : (
          <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold">
            Live Azure Pool ({servers.length} VMs)
          </span>
        )}
      </div>

      {/* Server Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {servers.map((server) => {
          const isHealthy = server.status === 'healthy';
          const isDegraded = server.status === 'degraded';
          const isFailed = server.status === 'failed' || server.status === 'disabled';

          return (
            <div
              key={server.id}
              className={`bg-cream-50 dark:bg-charcoal-800 rounded-2xl border p-5 shadow-card transition-all flex flex-col justify-between ${
                isFailed
                  ? 'border-rose-200 dark:border-rose-950/80 opacity-80'
                  : 'border-cream-300 dark:border-charcoal-700 hover:shadow-card-hover'
              }`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isHealthy
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                          : isDegraded
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
                      }`}
                    >
                      <Server aria-hidden="true" size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-charcoal-900 dark:text-cream-100">
                        {server.name}
                      </h3>
                      <div className="text-[11px] font-mono text-charcoal-400">
                        {server.ip}:{server.port}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isHealthy
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : isDegraded
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {isHealthy && <CheckCircle aria-hidden="true" size={12} className="text-emerald-600" />}
                    {isDegraded && <AlertTriangle aria-hidden="true" size={12} className="text-amber-600" />}
                    {isFailed && <XCircle aria-hidden="true" size={12} className="text-rose-600" />}
                    <span>{server.status}</span>
                  </span>
                </div>

                {/* Specs Pill */}
                <div className="flex items-center gap-2 text-[10px] text-charcoal-500 bg-cream-100 dark:bg-charcoal-900 px-3 py-1.5 rounded-lg mb-4 font-mono">
                  <span>{server.specs?.cores || 4} Cores</span>
                  <span>â€¢</span>
                  <span>{server.specs?.ram || '8 GB'} RAM</span>
                  <span>â€¢</span>
                  <span>{server.region}</span>
                </div>

                {/* Metrics */}
                <div className="space-y-3 mb-4">
                  {/* CPU Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-charcoal-600 dark:text-cream-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Cpu aria-hidden="true" size={14} className="text-charcoal-400" /> CPU Load
                      </span>
                      <span className="font-mono font-bold">{formatPercent(server.cpu)}</span>
                    </div>
                    <div className="w-full bg-cream-200 dark:bg-charcoal-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          server.cpu > 80 ? 'bg-rose-500' : server.cpu > 60 ? 'bg-amber-500' : 'bg-sage-600'
                        }`}
                        style={{ width: `${server.cpu}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-charcoal-600 dark:text-cream-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <HardDrive aria-hidden="true" size={14} className="text-charcoal-400" /> Memory Usage
                      </span>
                      <span className="font-mono font-bold">{formatPercent(server.memory)}</span>
                    </div>
                    <div className="w-full bg-cream-200 dark:bg-charcoal-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${server.memory}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
                    <span className="text-[10px] text-charcoal-400 block mb-0.5">Active Conns</span>
                    <span className="font-mono font-bold text-charcoal-800 dark:text-cream-100">
                      {server.activeConnections}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
                    <span className="text-[10px] text-charcoal-400 block mb-0.5">Total Processed</span>
                    <span className="font-mono font-bold text-charcoal-800 dark:text-cream-100">
                      {formatNumber(server.totalRequests)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
                    <span className="text-[10px] text-charcoal-400 block mb-0.5">Avg Response</span>
                    <span className="font-mono font-bold text-charcoal-800 dark:text-cream-100">
                      {formatMs(server.avgLatency)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
                    <span className="text-[10px] text-charcoal-400 block mb-0.5">Routing Weight</span>
                    <span className="font-mono font-bold text-sage-600">
                      {server.weight}x
                    </span>
                  </div>
                </div>

                {/* Weight Slider */}
                <div className="p-3 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700 mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-charcoal-500 font-medium flex items-center gap-1">
                      <Slider aria-hidden="true" size={12} /> Adjust Weight
                    </span>
                    <span className="font-mono font-bold text-sage-600">{server.weight}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={server.weight}
                    onChange={(e) => updateServerWeight(server.id, parseInt(e.target.value))}
                    className="w-full accent-sage-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-cream-200 dark:border-charcoal-700 flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleServerStatus(server.id)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border ${
                    server.status === 'disabled'
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      : 'bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-cream-200 border-cream-300 dark:border-charcoal-600 hover:bg-cream-100'
                  }`}
                >
                  <Power aria-hidden="true" size={14} />
                  <span>{server.status === 'disabled' ? 'Enable' : 'Disable'}</span>
                </button>

                {server.status === 'failed' ? (
                  <button
                    onClick={() => recoverServer(server.id)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 transition-colors"
                  >
                    <Refresh aria-hidden="true" size={14} />
                    <span>Recover</span>
                  </button>
                ) : (
                  <button
                    onClick={() => failServer(server.id)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 flex items-center gap-1 transition-colors"
                    title="Simulate hardware/network crash"
                  >
                    <AlertTriangle aria-hidden="true" size={14} />
                    <span>Crash</span>
                  </button>
                )}

                <button
                  onClick={() => removeServer(server.id)}
                  disabled={servers.length <= 1}
                  aria-label="Decommission Server"
                  className="p-2 rounded-xl text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-20 transition-colors"
                  title="Decommission Server"
                >
                  <Trash aria-hidden="true" size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Server Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-cream-50 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 rounded-2xl max-w-md w-full p-6 shadow-modal">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200 dark:border-charcoal-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sage-100 text-sage-600 flex items-center justify-center">
                  <Server aria-hidden="true" size={16} />
                </div>
                <h3 className="text-base font-bold text-charcoal-900 dark:text-cream-100">
                  Provision New Server Node
                </h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                aria-label="Close modal"
                className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-200"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateServer} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-charcoal-600 dark:text-cream-300 block mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Server D (or leave blank for auto)"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  className="w-full bg-white dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-xl px-3 py-2 text-xs text-charcoal-800 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="font-semibold text-charcoal-600 dark:text-cream-300">
                    Initial Capacity Weight
                  </label>
                  <span className="font-mono font-bold text-sage-600">{newServerWeight}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={newServerWeight}
                  onChange={(e) => setNewServerWeight(parseInt(e.target.value))}
                  className="w-full accent-sage-600 cursor-pointer"
                />
                <span className="text-[10px] text-charcoal-400">
                  Higher weight routes more requests during Weighted Round Robin.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-cream-100 dark:bg-charcoal-800 border border-cream-200 dark:border-charcoal-700 text-charcoal-500">
                <span className="font-semibold text-charcoal-700 dark:text-cream-200 block mb-1">
                  Auto-allocated Specifications:
                </span>
                <p>â€¢ Internal IP: 10.0.1.X</p>
                <p>â€¢ Target Pool: default-backend-svc</p>
                <p>â€¢ Health Check Path: /healthz (every 5s)</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-cream-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white font-semibold rounded-xl shadow-sm"
                >
                  Deploy Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

