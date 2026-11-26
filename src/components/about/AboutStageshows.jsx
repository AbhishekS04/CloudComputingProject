import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Refresh,
  ShieldCheck,
  ShieldAlert,
  Flash,
} from 'reicon-react';

const GATEWAY_BEATS = [
  {
    id: 0,
    targetId: 'server-1',
    targetName: 'Server A',
    pubIp: '52.172.229.225:5001',
    privIp: '10.0.1.10',
    reqId: 'req-4271',
    rttMs: '4.4 ms',
    clientIp: '198.51.100.4',
  },
  {
    id: 1,
    targetId: 'server-2',
    targetName: 'Server B',
    pubIp: '20.193.245.71:5001',
    privIp: '10.0.1.11',
    reqId: 'req-4272',
    rttMs: '4.8 ms',
    clientIp: '203.0.113.19',
  },
  {
    id: 2,
    targetId: 'server-3',
    targetName: 'Server C',
    pubIp: '52.172.255.132:5001',
    privIp: '10.0.1.12',
    reqId: 'req-4273',
    rttMs: '4.3 ms',
    clientIp: '198.51.100.77',
  },
];

/**
 * Framed Stageshow: Interactive Azure Gateway Request Lifecycle & SSE Satellite
 */
export function GatewayLifecycleStage() {
  const [beatIdx, setBeatIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setBeatIdx((prev) => (prev + 1) % GATEWAY_BEATS.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [playing]);

  const beat = GATEWAY_BEATS[beatIdx];

  return (
    <div className="relative pb-6 sm:pb-7">
      {/* Main Framed Product Window */}
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#14151A] text-neutral-100 shadow-card overflow-hidden">
        {/* Realistic Minimal Product Chrome */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/[0.07] bg-[#191B22]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            </div>
            <span className="text-[11px] font-mono text-neutral-400 truncate">
              LB-VM · 20.244.34.101:5000
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ROUND_ROBIN
            </span>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[10.5px] font-mono text-neutral-300 transition-colors cursor-pointer"
            >
              {playing ? <Pause size={11} /> : <Play size={11} />}
              <span>{playing ? 'Pause' : 'Play'}</span>
            </button>
            <button
              type="button"
              onClick={() => setBeatIdx((prev) => (prev + 1) % GATEWAY_BEATS.length)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[10.5px] font-mono text-neutral-300 transition-colors cursor-pointer"
              title="Step next request"
            >
              <Refresh size={11} />
              <span>Step</span>
            </button>
          </div>
        </div>

        {/* Visual Topology Stage */}
        <div className="relative px-4 sm:px-6 pt-5 pb-10 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.08),transparent_65%)]">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1.25fr] items-center gap-3 sm:gap-2">
            {/* Browser Client */}
            <div className="rounded-xl border border-white/[0.08] bg-[#1C1E26] p-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                <span>BROWSER</span>
                <span className="text-blue-400">POST</span>
              </div>
              <div className="mt-1 text-xs font-mono font-semibold text-white truncate">
                {beat.clientIp}
              </div>
              <div className="mt-0.5 text-[10.5px] font-mono text-neutral-500">
                /api/request
              </div>
            </div>

            {/* Wire 1 */}
            <div className="hidden sm:flex items-center justify-center w-10 relative">
              <div className="w-full h-px bg-white/15" />
              <motion.span
                key={`w1-${beat.id}`}
                initial={{ x: -16, opacity: 0 }}
                animate={{ x: 16, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.75, ease: 'easeInOut' }}
                className="absolute w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_#60a5fa]"
              />
            </div>

            {/* Azure LB-VM Core */}
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/[0.08] p-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-amber-300/80">
                <span>L7 GATEWAY</span>
                <span>:5000</span>
              </div>
              <div className="mt-1 text-xs font-semibold text-white">LB-VM Proxy</div>
              <div className="mt-0.5 text-[10.5px] font-mono text-amber-200/70">
                172.16.0.4
              </div>
            </div>

            {/* Wire 2 */}
            <div className="hidden sm:flex items-center justify-center w-10 relative">
              <div className="w-full h-px bg-white/15" />
              <motion.span
                key={`w2-${beat.id}`}
                initial={{ x: -16, opacity: 0 }}
                animate={{ x: 16, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.75, delay: 0.25, ease: 'easeInOut' }}
                className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"
              />
            </div>

            {/* Backend Azure Workers */}
            <div className="space-y-1.5">
              {GATEWAY_BEATS.map((node, idx) => {
                const selected = idx === beatIdx;
                return (
                  <button
                    key={node.targetId}
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setBeatIdx(idx);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-emerald-400/50 bg-emerald-500/[0.12] text-white'
                        : 'border-white/[0.06] bg-white/[0.02] text-neutral-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          selected ? 'bg-emerald-400' : 'bg-neutral-600'
                        }`}
                      />
                      <span className="text-xs font-medium truncate">
                        {node.targetName}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] opacity-80 shrink-0">
                      {node.privIp}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Satellite SSE Event Receipt Straddling Bottom Margin */}
      <div className="relative z-10 -mt-6 mx-3 sm:mx-6 rounded-xl border border-black/[0.1] dark:border-white/[0.14] bg-white dark:bg-[#1E2028] px-3.5 py-2.5 shadow-modal flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
            SSE /api/stream
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={beat.reqId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="text-neutral-700 dark:text-neutral-200 truncate"
            >
              {beat.reqId} → {beat.targetName} ({beat.pubIp}) · 200 OK
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums shrink-0">
          {beat.rttMs}
        </span>
      </div>
    </div>
  );
}

/**
 * Framed Stageshow: Interactive With-LB Failover vs Direct No-LB Attack Comparison
 */
export function FailoverCompareStage() {
  const [mode, setMode] = useState('with-lb'); // 'with-lb' | 'no-lb'
  const [serverBDown, setServerBDown] = useState(false);

  const isNoLb = mode === 'no-lb';
  const nodes = isNoLb
    ? [
        { name: 'Server A', load: 100, conns: '16/14', status: '503 CRASHED', crashed: true },
        { name: 'Server B', load: 0, conns: '0/14', status: 'IDLE', crashed: false },
        { name: 'Server C', load: 0, conns: '0/14', status: 'IDLE', crashed: false },
      ]
    : serverBDown
    ? [
        { name: 'Server A', load: 54, conns: '7/14', status: '200 OK · REROUTED', crashed: false },
        { name: 'Server B', load: 0, conns: '0/14', status: 'DRAINED · PROBE OFF', crashed: true },
        { name: 'Server C', load: 54, conns: '7/14', status: '200 OK · REROUTED', crashed: false },
      ]
    : [
        { name: 'Server A', load: 36, conns: '5/14', status: '200 OK', crashed: false },
        { name: 'Server B', load: 36, conns: '5/14', status: '200 OK', crashed: false },
        { name: 'Server C', load: 36, conns: '5/14', status: '200 OK', crashed: false },
      ];

  return (
    <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white/90 dark:bg-[#17181E] shadow-subtle overflow-hidden">
      {/* Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
        <div className="inline-flex items-center p-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.07]">
          <button
            type="button"
            onClick={() => setMode('with-lb')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              !isNoLb
                ? 'bg-white dark:bg-[#272833] text-neutral-900 dark:text-white shadow-sm font-semibold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'
            }`}
          >
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>With L7 Balancer</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('no-lb')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              isNoLb
                ? 'bg-white dark:bg-[#272833] text-neutral-900 dark:text-white shadow-sm font-semibold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'
            }`}
          >
            <ShieldAlert size={13} className="text-rose-500" />
            <span>Direct (--no-lb)</span>
          </button>
        </div>

        {!isNoLb && (
          <button
            type="button"
            onClick={() => setServerBDown((v) => !v)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors cursor-pointer ${
              serverBDown
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-[#22232D] border-black/[0.08] dark:border-white/[0.1] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {serverBDown ? 'Restore Server B' : 'Simulate Server B Down'}
          </button>
        )}
      </div>

      {/* Interactive Split Body */}
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] divide-y md:divide-y-0 md:divide-x divide-black/[0.06] dark:divide-white/[0.08]">
        {/* Left: Node Saturation Meters */}
        <div className="p-4 sm:p-5 space-y-3">
          {nodes.map((node) => (
            <div key={node.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {node.name}
                </span>
                <div className="flex items-center gap-2 font-mono text-[10.5px]">
                  <span className="text-neutral-400">{node.conns}</span>
                  <span
                    className={
                      node.crashed
                        ? 'text-rose-600 dark:text-rose-400 font-semibold'
                        : node.load === 0
                        ? 'text-neutral-400'
                        : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    }
                  >
                    {node.status}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-black/[0.05] dark:bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${node.load}%` }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className={`h-full rounded-full ${
                    node.crashed
                      ? 'bg-rose-500'
                      : node.load > 45
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right: Causal Outcome Log */}
        <div className="p-4 sm:p-5 flex flex-col justify-between bg-[#14151A] text-neutral-200 font-mono text-[11px] leading-relaxed">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              Cluster Verdict
            </div>
            {isNoLb ? (
              <>
                <div className="text-rose-400">
                  POST 52.172.229.225:5001/api/process
                </div>
                <div className="text-neutral-400">
                  16 concurrent sockets pinned to Server A; siblings B &amp; C receive 0 requests.
                </div>
                <div className="text-rose-300 font-semibold pt-1">
                  → 503 Overload · No health probe to reroute.
                </div>
              </>
            ) : serverBDown ? (
              <>
                <div className="text-amber-300">
                  Health probe marked server-2 UNHEALTHY
                </div>
                <div className="text-neutral-400">
                  LB-VM evicted Server B from active pool and split incoming burst 50/50 across A &amp; C.
                </div>
                <div className="text-emerald-400 font-semibold pt-1">
                  → 200 OK · Zero dropped client requests.
                </div>
              </>
            ) : (
              <>
                <div className="text-emerald-400">
                  POST 20.244.34.101:5000/api/request
                </div>
                <div className="text-neutral-400">
                  Concurrent burst distributed evenly across all 3 Central India VMs.
                </div>
                <div className="text-emerald-300 font-semibold pt-1">
                  → 100% uptime · Headroom preserved on every VM.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const STRATEGIES = [
  {
    id: 'rr',
    name: 'Round Robin',
    complexity: 'O(1)',
    affinity: 'None',
    scope: 'Live LB & Studio',
    tradeoff: 'Ignores slow outlier requests when VM compute times diverge.',
    note: 'Sequential cyclic rotation across healthy nodes.',
    bars: [34, 33, 33],
    labels: ['1/3', '1/3', '1/3'],
    clients: [
      { ip: '198.51.100.4', target: 'Server A' },
      { ip: '203.0.113.19', target: 'Server B' },
      { ip: '192.0.2.145', target: 'Server C' },
    ],
  },
  {
    id: 'lc',
    name: 'Least Connections',
    complexity: 'O(N)',
    affinity: 'Dynamic',
    scope: 'Live LB & Studio',
    tradeoff: 'Inspects active socket count on every incoming dispatch.',
    note: 'Routes to whichever healthy VM has the fewest active connections.',
    bars: [16, 42, 42],
    labels: ['Busy (120ms)', 'Least Loaded', 'Least Loaded'],
    clients: [
      { ip: '198.51.100.4', target: 'Server B (0c)' },
      { ip: '203.0.113.19', target: 'Server C (0c)' },
      { ip: '192.0.2.145', target: 'Server B (1c)' },
    ],
  },
  {
    id: 'ih',
    name: 'IP Hash',
    complexity: 'O(1)',
    affinity: 'Sticky IP',
    scope: 'Live LB & Studio',
    tradeoff: 'Heavy corporate NAT gateways can skew load toward one VM.',
    note: 'Hashes source client IP modulo healthy pool count.',
    bars: [65, 10, 25],
    labels: ['Pinned Client X', 'Idle', 'Pinned Client Y'],
    clients: [
      { ip: '198.51.100.4', target: 'Always Server A' },
      { ip: '198.51.100.4', target: 'Always Server A' },
      { ip: '203.0.113.19', target: 'Always Server C' },
    ],
  },
  {
    id: 'wrr',
    name: 'Weighted RR',
    complexity: 'O(1)',
    affinity: 'Proportional',
    scope: 'Simulation Studio',
    tradeoff: 'Static weight multipliers do not adapt automatically to CPU spikes.',
    note: 'Allocates traffic in proportion to VM tier weight (2:1:1).',
    bars: [50, 25, 25],
    labels: ['Weight 2x (50%)', 'Weight 1x (25%)', 'Weight 1x (25%)'],
    clients: [
      { ip: '198.51.100.4', target: 'Server A (2x)' },
      { ip: '203.0.113.19', target: 'Server A (2x)' },
      { ip: '192.0.2.145', target: 'Server B (1x)' },
    ],
  },
];

/**
 * Ruled Interactive Algorithm Workbench (Replaces 4 static cards)
 */
export function StrategyWorkbenchStage() {
  const [selectedId, setSelectedId] = useState('rr');
  const active = STRATEGIES.find((s) => s.id === selectedId) || STRATEGIES[0];

  return (
    <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white/90 dark:bg-[#17181E] shadow-subtle overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] divide-y md:divide-y-0 md:divide-x divide-black/[0.06] dark:divide-white/[0.08]">
        {/* Left Ruled Strategy List */}
        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
          {STRATEGIES.map((s) => {
            const isSelected = s.id === active.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900/[0.045] dark:bg-white/[0.06] text-neutral-950 dark:text-white'
                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                }`}
              >
                <div>
                  <div className="text-xs sm:text-sm font-semibold">{s.name}</div>
                  <div className="text-[10.5px] opacity-75 mt-0.5">{s.scope}</div>
                </div>
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08]">
                  {s.complexity}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Live Strategy Preview */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                {active.name}
              </h3>
              <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                Affinity: <strong className="text-neutral-800 dark:text-neutral-200">{active.affinity}</strong>
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
              {active.note}
            </p>

            {/* Distribution Bars */}
            <div className="mt-4 space-y-2.5">
              {['Server A', 'Server B', 'Server C'].map((srv, idx) => (
                <div key={srv} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-neutral-700 dark:text-neutral-200">{srv}</span>
                    <span className="font-mono text-neutral-500 dark:text-neutral-400">
                      {active.labels[idx]}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.07] overflow-hidden">
                    <motion.div
                      initial={false}
                      animate={{ width: `${active.bars[idx]}%` }}
                      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                      className="h-full rounded-full bg-blue-500 dark:bg-blue-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Packet Map + Tradeoff Footer */}
          <div className="space-y-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10.5px]">
              {active.clients.map((c, idx) => (
                <div
                  key={`${active.id}-${idx}`}
                  className="px-2.5 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-300 truncate"
                >
                  {c.ip} → <span className="text-neutral-900 dark:text-white font-semibold">{c.target}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Flash size={12} className="text-blue-500 shrink-0" />
              <span>
                <strong className="text-neutral-700 dark:text-neutral-300 font-medium">Trade-off:</strong>{' '}
                {active.tradeoff}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
