import React, { useState } from 'react';
import { Compass, Shield, Zap, Lock, Cpu, Server, CheckCircle2 } from 'lucide-react';

export default function DesignLabView() {
  const [selectedTopology, setSelectedTopology] = useState('l7');
  const [tlsMode, setTlsMode] = useState('termination');
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#FAF8F2] dark:bg-charcoal-900 p-6 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 shadow-subtle">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <h2 className="text-xl font-extrabold text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
            Architecture Design Lab
          </h2>
        </div>
        <p className="text-xs text-charcoal-500 dark:text-cream-400">
          Prototype and configure distributed topologies, transport layers, encryption boundaries, and edge policies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lab Config 1: Proxy Layer */}
        <div className="bg-[#FAF8F2] dark:bg-charcoal-900 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 p-5 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-charcoal-700 dark:text-cream-200">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>Proxy Inspection Layer</span>
          </div>

          <div className="space-y-2 text-xs">
            <button
              onClick={() => setSelectedTopology('l4')}
              className={`w-full p-3 rounded-xl border text-left transition-all ${
                selectedTopology === 'l4'
                  ? 'bg-[#C5E5C9] text-[#1E3A24] border-[#A3D2A7] font-bold shadow-xs'
                  : 'bg-white dark:bg-charcoal-800 border-[#DDD6C6] text-charcoal-700 dark:text-cream-300'
              }`}
            >
              <div className="font-bold mb-0.5">Layer 4 (Transport / TCP)</div>
              <p className="text-[11px] opacity-80">
                Ultra-fast packet routing via IP & Port. Zero payload parsing. Millions of packets/sec.
              </p>
            </button>

            <button
              onClick={() => setSelectedTopology('l7')}
              className={`w-full p-3 rounded-xl border text-left transition-all ${
                selectedTopology === 'l7'
                  ? 'bg-[#C5E5C9] text-[#1E3A24] border-[#A3D2A7] font-bold shadow-xs'
                  : 'bg-white dark:bg-charcoal-800 border-[#DDD6C6] text-charcoal-700 dark:text-cream-300'
              }`}
            >
              <div className="font-bold mb-0.5">Layer 7 (Application / HTTP)</div>
              <p className="text-[11px] opacity-80">
                Inspects URLs, headers, cookies, and gRPC methods. Path routing & smart sticky sessions.
              </p>
            </button>
          </div>
        </div>

        {/* Lab Config 2: TLS Architecture */}
        <div className="bg-[#FAF8F2] dark:bg-charcoal-900 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 p-5 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-charcoal-700 dark:text-cream-200">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>TLS Encryption Boundary</span>
          </div>

          <div className="space-y-2 text-xs">
            <button
              onClick={() => setTlsMode('termination')}
              className={`w-full p-3 rounded-xl border text-left transition-all ${
                tlsMode === 'termination'
                  ? 'bg-[#C5E5C9] text-[#1E3A24] border-[#A3D2A7] font-bold shadow-xs'
                  : 'bg-white dark:bg-charcoal-800 border-[#DDD6C6] text-charcoal-700 dark:text-cream-300'
              }`}
            >
              <div className="font-bold mb-0.5">TLS Edge Termination</div>
              <p className="text-[11px] opacity-80">
                Decrypts SSL at Load Balancer. Offloads cryptographic math from backends.
              </p>
            </button>

            <button
              onClick={() => setTlsMode('passthrough')}
              className={`w-full p-3 rounded-xl border text-left transition-all ${
                tlsMode === 'passthrough'
                  ? 'bg-[#C5E5C9] text-[#1E3A24] border-[#A3D2A7] font-bold shadow-xs'
                  : 'bg-white dark:bg-charcoal-800 border-[#DDD6C6] text-charcoal-700 dark:text-cream-300'
              }`}
            >
              <div className="font-bold mb-0.5">End-to-End Passthrough</div>
              <p className="text-[11px] opacity-80">
                Encrypted packets pass through balancer untouched directly to target container.
              </p>
            </button>
          </div>
        </div>

        {/* Lab Config 3: Edge Defenses */}
        <div className="bg-[#FAF8F2] dark:bg-charcoal-900 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 p-5 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-charcoal-700 dark:text-cream-200">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Edge Defenses</span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] cursor-pointer">
              <div>
                <span className="font-bold text-charcoal-900 dark:text-cream-100 block">Token Bucket Rate Limiting</span>
                <span className="text-[10px] text-charcoal-400">100 req/sec max per IP burst</span>
              </div>
              <input
                type="checkbox"
                checked={rateLimitEnabled}
                onChange={(e) => setRateLimitEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>

            <div className="p-3 rounded-xl bg-[#EBE6DA]/50 dark:bg-charcoal-800/50 border border-[#DDD6C6] text-[11px] text-charcoal-600 dark:text-cream-300 leading-relaxed">
              <strong>Simulated Topology Outcome:</strong>
              <br />
              • Handshake RTT: {tlsMode === 'termination' ? '1 RTT at Edge (24 ms)' : '2 RTTs to Origin (72 ms)'}
              <br />
              • Inspection: {selectedTopology === 'l7' ? 'Full HTTP Headers + Path' : 'TCP SYN / ACK only'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
