import React from 'react';
import { ShieldCheck, Zap, Globe, Radio } from 'lucide-react';

/**
 * EdgeGatewayTelemetryCard - Apple Bento telemetry card for the Edge Ingress Gateway
 * Displays protocol, TLS termination, CDN cache ratio, and path latency distributions.
 */
export default function EdgeGatewayTelemetryCard({ className = '' }) {
  return (
    <div
      className={`p-5 rounded-2xl bg-white/80 dark:bg-[#1A1A1A]/90 border border-neutral-200/80 dark:border-white/10 shadow-xs backdrop-blur-md flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header with VIP Badge */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                Edge Ingress Gateway Telemetry
              </h4>
            </div>
            <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5">
              Real-time packet ingestion, edge proxy protocol distribution, and TLS termination statistics
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
            VIP: 203.0.113.7:443
          </span>
        </div>

        {/* 3 Metrics Sub-tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-3.5">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Protocol</span>
            <p className="text-sm font-extrabold font-mono text-neutral-800 dark:text-white mt-0.5">HTTP/2 + TLS 1.3</p>
            <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">Keep-Alive: ON</p>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Cache Hit</span>
            <p className="text-sm font-extrabold font-mono text-neutral-800 dark:text-white mt-0.5">94.6% Hit Rate</p>
            <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">CDN Edge Anycast</p>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Channels</span>
            <p className="text-sm font-extrabold font-mono text-neutral-800 dark:text-white mt-0.5">5 Active Paths</p>
            <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">Direct, CDN, Edge, API, WS</p>
          </div>
        </div>

        {/* Latency Distribution Channels */}
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.02] border border-neutral-200/80 dark:border-white/10">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-neutral-700 dark:text-neutral-300">Direct HTTP & REST</span>
            </span>
            <span className="font-bold text-neutral-800 dark:text-white">~24 ms p50</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.02] border border-neutral-200/80 dark:border-white/10">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-neutral-700 dark:text-neutral-300">CDN & Static Assets</span>
            </span>
            <span className="font-bold text-neutral-800 dark:text-white">~8 ms p50</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.02] border border-neutral-200/80 dark:border-white/10">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
              <span className="text-neutral-700 dark:text-neutral-300">Stateful WebSockets</span>
            </span>
            <span className="font-bold text-neutral-800 dark:text-white">0 reconnect drops</span>
          </div>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="pt-3 border-t border-neutral-200/80 dark:border-white/10 flex items-center justify-between text-[11px] font-mono mt-4">
        <span className="text-neutral-400 dark:text-neutral-500">L7 Reverse Proxy: Online</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Health Probes: 100% Passing
        </span>
      </div>
    </div>
  );
}
