import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Server, Activity, ShieldCheck, AlertCircle, RefreshCw, Power } from 'lucide-react';

/**
 * NodeFleetTable - Enterprise Azure VM Fleet & Node Management Table
 * Inspired by Reference Images 0, 1 & 3:
 * - High-density tabular layout
 * - Real-time CPU & RAM micro-gauges
 * - Active TCP socket counts and P95 latency
 * - Azure Region & VM SKU info
 * - Interactive node failover simulation & drain actions
 */
export default function NodeFleetTable({
  servers = [],
  onToggleServer,
  className = '',
}) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Default Azure VM nodes enriched metadata if basic servers passed
  const fleetData = servers.map((srv, idx) => {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const letter = letters[idx] || String(idx + 1);
    const isHealthy = srv.status === 'healthy' || srv.healthy;

    return {
      id: srv.id || `srv-${idx + 1}`,
      name: srv.name || `Server ${letter}`,
      vmName: srv.host || `azure-vm-backend-0${idx + 1}`,
      sku: 'Standard_B2s (2 vCPU, 4 GiB)',
      region: srv.region || 'Azure Central India',
      zone: `Zone ${(idx % 3) + 1}`,
      ip: srv.privateIp || `10.0.1.1${idx}`,
      publicIp: srv.publicIp || srv.ip || '52.172.229.225:5001',
      cpu: isHealthy ? srv.cpu || 28 + (idx * 12) : 0,
      memory: isHealthy ? 42 + (idx * 8) : 0,
      connections: isHealthy ? srv.activeConnections || srv.connections || 15 + (idx * 4) : 0,
      totalRequests: srv.totalRequests || 0,
      latency: isHealthy ? srv.avgLatency || srv.latency || 20 + (idx * 3) : 999,
      status: isHealthy ? 'ACTIVE' : 'OFFLINE',
      uptime: isHealthy ? '99.98%' : 'FAILOVER',
    };
  });

  const filteredFleet = fleetData.filter((node) => {
    if (filter === 'ACTIVE' && node.status !== 'ACTIVE') return false;
    if (filter === 'OFFLINE' && node.status !== 'OFFLINE') return false;
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
  });

  return (
    <div className={cn('flex flex-col select-none', className)}>
      {/* Table Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-neutral-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Azure Backend Node Fleet ({filteredFleet.length}/{fleetData.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search VM, IP, Region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 px-2.5 rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs font-mono text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-44"
          />

          {/* Filter Pills */}
          <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-white/10 text-[11px] font-mono">
            {['ALL', 'ACTIVE', 'OFFLINE'].map((statusKey) => (
              <button
                key={statusKey}
                type="button"
                onClick={() => setFilter(statusKey)}
                className={cn(
                  'px-2 py-0.5 rounded-[5px] transition-all cursor-pointer font-medium',
                  filter === statusKey
                    ? 'bg-white dark:bg-[#2A2A2A] text-neutral-900 dark:text-white shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                )}
              >
                {statusKey}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.02]">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-neutral-200/80 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.03] text-neutral-500 dark:text-neutral-400 text-[10px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Node / Azure VM</th>
              <th className="py-2.5 px-3">Location & SKU</th>
              <th className="py-2.5 px-3">Private IP</th>
              <th className="py-2.5 px-3">Routed Reqs</th>
              <th className="py-2.5 px-3">CPU Load</th>
              <th className="py-2.5 px-3">RAM Usage</th>
              <th className="py-2.5 px-3">Active TCP</th>
              <th className="py-2.5 px-3">p95 Latency</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Failover Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/60 dark:divide-white/5">
            {filteredFleet.map((node) => {
              const isHealthy = node.status === 'ACTIVE';

              return (
                <tr
                  key={node.id}
                  className="hover:bg-neutral-50/60 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Node Name & VM */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                        )}
                      />
                      <div>
                        <div className="font-bold text-neutral-900 dark:text-white">
                          {node.name}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {node.vmName}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Region & SKU */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="text-neutral-700 dark:text-neutral-300">
                      {node.region}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {node.zone} · Standard_D4s
                    </div>
                  </td>

                  {/* IP */}
                  <td className="py-2.5 px-3 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                    {node.ip}
                  </td>

                  {/* Routed Reqs */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-bold text-neutral-900 dark:text-white">
                    {node.totalRequests.toLocaleString()}{' '}
                    <span className="text-[10px] font-normal text-neutral-400">reqs</span>
                  </td>

                  {/* CPU Meter */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
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
                      <span className="text-[11px] text-neutral-700 dark:text-neutral-300 w-8">
                        {node.cpu}%
                      </span>
                    </div>
                  </td>

                  {/* Memory */}
                  <td className="py-2.5 px-3 whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                    {node.memory}%
                  </td>

                  {/* Active Sockets */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-neutral-900 dark:text-white">
                    {node.connections} <span className="text-[10px] font-normal text-neutral-400">conns</span>
                  </td>

                  {/* Latency */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {isHealthy ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {node.latency}ms
                      </span>
                    ) : (
                      <span className="text-neutral-400">--</span>
                    )}
                  </td>

                  {/* Status Capsule */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1',
                        isHealthy
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/60'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800/60'
                      )}
                    >
                      <span className={cn('w-1 h-1 rounded-full', isHealthy ? 'bg-emerald-500' : 'bg-rose-500')} />
                      {node.status}
                    </span>
                  </td>

                  {/* Toggle Failover */}
                  <td className="py-2.5 px-3 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => onToggleServer && onToggleServer(node.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border cursor-pointer',
                        isHealthy
                          ? 'bg-neutral-100 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-neutral-700 dark:text-neutral-300 hover:text-rose-600 border-neutral-200 dark:border-white/10'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-xs'
                      )}
                    >
                      {isHealthy ? 'Simulate Crash' : 'Restore VM'}
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
}
