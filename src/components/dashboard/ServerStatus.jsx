import React from 'react';
import { useServers } from '../../hooks/useServers';
import { Server, CheckCircle, AlertTriangle, XCircle, Power, Refresh } from 'reicon-react';
import { formatPercent, formatMs } from '../../utils/formatters';

export default function ServerStatus() {
  const { servers, toggleServerStatus, failServer, recoverServer } = useServers();

  return (
    <div className="bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl p-5 shadow-subtle">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100">
            Backend Server Health Summary
          </h4>
          <p className="text-xs text-charcoal-400">Real-time status and operational controls</p>
        </div>
      </div>

      <div className="space-y-3">
        {servers.map((s) => {
          const isHealthy = s.status === 'healthy';
          const isDegraded = s.status === 'degraded';
          const isFailed = s.status === 'failed' || s.status === 'disabled';

          return (
            <div
              key={s.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700 hover:border-cream-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isHealthy
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60'
                      : isDegraded
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60'
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60'
                  }`}
                >
                  <Server className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-charcoal-800 dark:text-cream-100">
                      {s.name}
                    </span>
                    <span className="text-[10px] font-mono text-charcoal-400">{s.ip}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-charcoal-500 mt-0.5">
                    <span>CPU: <strong className="font-mono text-charcoal-800 dark:text-cream-200">{formatPercent(s.cpu)}</strong></span>
                    <span>Conns: <strong className="font-mono text-charcoal-800 dark:text-cream-200">{s.activeConnections}</strong></span>
                    <span>Lat: <strong className="font-mono text-charcoal-800 dark:text-cream-200">{formatMs(s.avgLatency)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Status pill & Actions */}
              <div className="flex items-center gap-2">
                <span
                  className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    isHealthy
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : isDegraded
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {isHealthy && <CheckCircle className="w-3 h-3 text-emerald-600" aria-hidden="true" />}
                  {isDegraded && <AlertTriangle className="w-3 h-3 text-amber-600" aria-hidden="true" />}
                  {isFailed && <XCircle className="w-3 h-3 text-rose-600" aria-hidden="true" />}
                  <span>{s.status}</span>
                </span>

                <button
                  onClick={() => toggleServerStatus(s.id)}
                  className="p-1.5 rounded-lg bg-white dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300 hover:bg-cream-200 transition-colors"
                  title={s.status === 'disabled' ? 'Enable Server' : 'Disable Server'}
                  aria-label={s.status === 'disabled' ? 'Enable Server' : 'Disable Server'}
                >
                  <Power className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
