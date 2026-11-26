import React, { memo } from 'react';

/**
 * EdgeGatewayTelemetryCard - Clean telemetry summary for the Edge Ingress Gateway.
 */
const EdgeGatewayTelemetryCard = memo(function EdgeGatewayTelemetryCard({ className = '' }) {
  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col justify-between font-sans ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-black/[0.05] dark:border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Edge Ingress Gateway
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              L7 reverse proxy · VIP <span className="font-mono text-neutral-700 dark:text-neutral-300">203.0.113.7:443</span>
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            Healthy
          </span>
        </div>

        {/* Summary Strip (single surface, hairline dividers — no nested box inventory) */}
        <div className="grid grid-cols-3 divide-x divide-black/[0.05] dark:divide-white/[0.06] rounded-xl bg-black/[0.02] dark:bg-white/[0.025] my-4 py-3">
          <div className="px-3.5">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Protocol</span>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5">HTTP/2 · TLS 1.3</p>
          </div>
          <div className="px-3.5">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Edge cache hit</span>
            <p className="text-sm font-semibold font-mono tabular-nums text-neutral-900 dark:text-white mt-0.5">94.6%</p>
          </div>
          <div className="px-3.5">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Active paths</span>
            <p className="text-sm font-semibold font-mono tabular-nums text-neutral-900 dark:text-white mt-0.5">5 routes</p>
          </div>
        </div>

        {/* Path Latency List */}
        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] text-xs">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-neutral-600 dark:text-neutral-300">Direct HTTP &amp; REST</span>
            <span className="font-mono tabular-nums font-medium text-neutral-900 dark:text-white">24 ms p50</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-neutral-600 dark:text-neutral-300">CDN &amp; Static Assets</span>
            <span className="font-mono tabular-nums font-medium text-neutral-900 dark:text-white">8 ms p50</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-neutral-600 dark:text-neutral-300">Stateful WebSockets</span>
            <span className="font-mono tabular-nums font-medium text-neutral-900 dark:text-white">0 drops</span>
          </div>
        </div>
      </div>

      {/* Quiet Footer */}
      <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 mt-3">
        <span>Keep-alive enabled · Anycast edge</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">100% probes passing</span>
      </div>
    </div>
  );
});

export default EdgeGatewayTelemetryCard;
