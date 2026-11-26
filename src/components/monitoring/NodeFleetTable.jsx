import React, { useState, useMemo, memo } from 'react';
import { cn } from '../../lib/utils';

/**
 * NodeFleetTable - Clean VM Fleet & Node Management Table
 */
const NodeFleetTable = memo(function NodeFleetTable({
  servers = [],
  onToggleServer,
  className = '',
}) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fleetData = useMemo(() => servers.map((srv, idx) => {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const letter = letters[idx] || String(idx + 1);
    const isHealthy = srv.status === 'healthy' || srv.healthy;
    const nodeStatus = isHealthy ? 'ACTIVE' : (srv.status === 'failed' ? 'CRASHED' : 'OFFLINE');

    return {
      id: srv.id || `srv-${idx + 1}`,
      name: srv.name || `Server ${letter}`,
      vmName: srv.host || `azure-vm-backend-0${idx + 1}`,
      region: srv.region || 'Azure Central India',
      zone: `Zone ${(idx % 3) + 1}`,
      ip: srv.privateIp || `10.0.1.1${idx}`,
      cpu: isHealthy ? srv.cpu || 28 + (idx * 12) : 0,
      memory: isHealthy ? 42 + (idx * 8) : 0,
      connections: isHealthy ? srv.activeConnections || srv.connections || 15 + (idx * 4) : 0,
      totalRequests: srv.totalRequests || 0,
      latency: isHealthy ? srv.avgLatency || srv.latency || 20 + (idx * 3) : 999,
      status: nodeStatus,
    };
  }), [servers]);

  const filteredFleet = useMemo(() => fleetData.filter((node) => {
    if (filter === 'ACTIVE' && node.status !== 'ACTIVE') return false;
    if (filter === 'OFFLINE' && node.status === 'ACTIVE') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        node.name.toLowerCase().includes(q) ||
        node.vmName.toLowerCase().includes(q) ||
        node.ip.toLowerCase().includes(q) ||
        node.region.toLowerCase().includes(q)
      );
    }
    return true;
  }), [fleetData, filter, search]);

  return (
    <div className={cn('flex flex-col select-none font-sans', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Backend VM Fleet
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {filteredFleet.length} of {fleetData.length} compute nodes shown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter VM or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 px-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-40"
          />

          <div className="flex items-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'OFFLINE', label: 'Offline' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  'px-2.5 py-0.5 rounded-full transition-all duration-150 cursor-pointer',
                  filter === tab.id
                    ? 'bg-white dark:bg-[#202227] text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-neutral-500 dark:text-neutral-400 text-[11px] font-medium">
              <th className="py-2.5 px-3 font-medium">Node</th>
              <th className="py-2.5 px-3 font-medium">Region</th>
              <th className="py-2.5 px-3 font-medium">Private IP</th>
              <th className="py-2.5 px-3 font-medium">Routed</th>
              <th className="py-2.5 px-3 font-medium">CPU</th>
              <th className="py-2.5 px-3 font-medium">RAM</th>
              <th className="py-2.5 px-3 font-medium">Sockets</th>
              <th className="py-2.5 px-3 font-medium">p95</th>
              <th className="py-2.5 px-3 font-medium">Status</th>
              <th className="py-2.5 px-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
            {filteredFleet.map((node) => {
              const isHealthy = node.status === 'ACTIVE';

              return (
                <tr
                  key={node.id}
                  className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {node.name}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400">
                      {node.vmName}
                    </div>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="text-neutral-700 dark:text-neutral-300">
                      {node.region}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {node.zone}
                    </div>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                    {node.ip}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums font-medium text-neutral-900 dark:text-white">
                    {node.totalRequests.toLocaleString()}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-black/[0.07] dark:bg-white/10 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            node.cpu > 80
                              ? 'bg-rose-500'
                              : node.cpu > 55
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          )}
                          style={{ width: `${node.cpu}%` }}
                        />
                      </div>
                      <span className="font-mono tabular-nums text-[11px] text-neutral-700 dark:text-neutral-300 w-8">
                        {node.cpu}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                    {node.memory}%
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums text-neutral-900 dark:text-white">
                    {node.connections}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums">
                    {isHealthy ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {node.latency} ms
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1.5',
                        isHealthy
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', isHealthy ? 'bg-emerald-500' : 'bg-rose-500')} />
                      {isHealthy ? 'Active' : 'Offline'}
                    </span>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => onToggleServer && onToggleServer(node.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer',
                        isHealthy
                          ? 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-rose-500/15 text-neutral-700 dark:text-neutral-300 hover:text-rose-500'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      )}
                    >
                      {isHealthy ? 'Simulate crash' : 'Restore'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default NodeFleetTable;
