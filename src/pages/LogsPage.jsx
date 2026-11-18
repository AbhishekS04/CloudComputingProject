import React, { useState, useMemo } from 'react';
import { useTraffic } from '../hooks/useTraffic';
import { useServers } from '../hooks/useServers';
import {
  FileText,
  Search,
  Trash,
  Download,
  CheckCircle,
  XCircle,
  Pause,
  Play
} from 'reicon-react';
import { formatTime, formatMs } from '../utils/formatters';

export default function LogsPage() {
  const { requestLogs, clearLogs } = useTraffic();
  const { servers } = useServers();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServerFilter, setSelectedServerFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [isPaused, setIsPaused] = useState(false);

  // Filter logs based on search and selected filters
  const filteredLogs = useMemo(() => {
    return requestLogs.filter((log) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.client?.ip.includes(searchTerm) ||
        log.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.serverName && log.serverName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Server filter
      const matchesServer =
        selectedServerFilter === 'ALL' ||
        (log.server && log.server.id === selectedServerFilter) ||
        (selectedServerFilter === 'NONE' && !log.server);

      // Status filter
      const matchesStatus =
        selectedStatusFilter === 'ALL' ||
        (selectedStatusFilter === '200' && log.status === 200) ||
        (selectedStatusFilter === '5xx' && log.status >= 500);

      return matchesSearch && matchesServer && matchesStatus;
    });
  }, [requestLogs, searchTerm, selectedServerFilter, selectedStatusFilter]);

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `loadflow-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-cream-50 dark:bg-charcoal-800 p-5 rounded-2xl border border-cream-300 dark:border-charcoal-700 shadow-card">
        <div>
          <h2 className="text-lg font-bold text-charcoal-900 dark:text-cream-100">
            Live Cluster Request Logs
          </h2>
          <p className="text-xs text-charcoal-500 dark:text-cream-400">
            Real-time HTTP connection access logs, target routing destinations, and response latencies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isPaused
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                : 'bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-cream-200 border-cream-300'
            }`}
          >
            {isPaused ? <Play aria-hidden="true" size={14} weight="Filled" /> : <Pause aria-hidden="true" size={14} weight="Filled" />}
            <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-charcoal-700 border border-cream-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cream-200 text-xs font-semibold hover:bg-cream-100 transition-colors"
          >
            <Download aria-hidden="true" size={14} />
            <span>Export JSON</span>
          </button>

          <button
            onClick={clearLogs}
            aria-label="Clear All Logs"
            className="p-2 rounded-xl text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Clear All Logs"
          >
            <Trash aria-hidden="true" size={16} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-cream-50 dark:bg-charcoal-800 p-4 rounded-2xl border border-cream-300 dark:border-charcoal-700 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search aria-hidden="true" size={16} className="text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search request ID, client IP, endpoint, or server..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-cream-100 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 rounded-xl pl-9 pr-3 py-2 text-charcoal-800 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
          />
        </div>

        {/* Server Filter */}
        <div className="flex items-center gap-2">
          <span className="text-charcoal-400 font-medium">Server:</span>
          <select
            value={selectedServerFilter}
            onChange={(e) => setSelectedServerFilter(e.target.value)}
            className="bg-cream-100 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 rounded-xl px-3 py-2 font-medium text-charcoal-800 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
          >
            <option value="ALL">All Nodes</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="NONE">Unrouted (503)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-charcoal-400 font-medium">Status:</span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-cream-100 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 rounded-xl px-3 py-2 font-medium text-charcoal-800 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="200">200 OK</option>
            <option value="5xx">5xx Errors</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-cream-300 dark:border-charcoal-700 bg-cream-100/70 dark:bg-charcoal-900/70 text-[11px] font-bold text-charcoal-500 dark:text-cream-400 uppercase tracking-wider">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4">Target Node</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 dark:divide-charcoal-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-charcoal-400">
                    <FileText aria-hidden="true" size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No request records matching active filters.</p>
                    <p className="text-[11px] mt-0.5">Ensure the simulation engine is running.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 100).map((log) => {
                  const is200 = log.status === 200;
                  const is503 = log.status === 503;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-cream-100/50 dark:hover:bg-charcoal-700/50 transition-colors font-mono"
                    >
                      <td className="py-3 px-4 font-bold text-charcoal-800 dark:text-cream-100">
                        {log.id}
                      </td>
                      <td className="py-3 px-4 text-charcoal-400 text-[11px]">
                        {formatTime(log.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col font-sans">
                          <span className="font-bold text-charcoal-800 dark:text-cream-100 text-[11px]">
                            {log.client?.name || 'Client'}
                          </span>
                          <span className="text-[10px] font-mono text-charcoal-400">
                            {log.client?.ip}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-cream-200 dark:bg-charcoal-700 text-charcoal-700 dark:text-cream-200 text-[10px] font-bold mr-1.5">
                          {log.method}
                        </span>
                        <span className="text-charcoal-600 dark:text-cream-300 font-sans text-xs">
                          {log.endpoint}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {log.server ? (
                          <div className="flex items-center gap-1.5 font-sans">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: log.server.color || '#4D7C5F' }}
                            />
                            <span className="font-bold text-charcoal-800 dark:text-cream-100 text-xs">
                              {log.server.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-rose-500 font-bold font-sans text-xs">
                            None (All Down)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-charcoal-600 dark:text-cream-300">
                        {formatMs(log.latency)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            is200
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {is200 ? (
                            <CheckCircle aria-hidden="true" size={12} className="text-emerald-600" />
                          ) : (
                            <XCircle aria-hidden="true" size={12} className="text-rose-600" />
                          )}
                          <span>
                            {log.status} {log.statusText}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
