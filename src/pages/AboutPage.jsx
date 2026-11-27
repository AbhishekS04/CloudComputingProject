import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SystemDesignNavbar from '../components/layout/SystemDesignNavbar';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { BrandLogo } from '../components/ui/BrandLogo';
import BlurScrollReveal from '../components/ui/BlurScrollReveal';
import {
  GatewayLifecycleStage,
  FailoverCompareStage,
  StrategyWorkbenchStage,
} from '../components/about/AboutStageshows';
import {
  ArrowRight,
  ArrowUpRight,
  ChartBar,
  Check,
  CodeSquare,
  Copy,
  Layers,
} from 'reicon-react';

/* ─────────────────────────── data ─────────────────────────── */

const AZURE_NODES = [
  { vm: 'LB-VM', name: 'L7 Gateway', role: 'Reverse Proxy & Health Probes', publicEndpoint: '20.244.34.101:5000', privateIp: '172.16.0.4', color: 'bg-amber-400', ring: 'ring-amber-400/30' },
  { vm: 'VM 01', name: 'Server A',   role: 'Python Flask Worker',            publicEndpoint: '52.172.229.225:5001', privateIp: '10.0.1.10', color: 'bg-blue-500',   ring: 'ring-blue-500/30'  },
  { vm: 'VM 02', name: 'Server B',   role: 'Python Flask Worker',            publicEndpoint: '20.193.245.71:5001',  privateIp: '10.0.1.11', color: 'bg-emerald-500',ring: 'ring-emerald-500/30'},
  { vm: 'VM 03', name: 'Server C',   role: 'Python Flask Worker',            publicEndpoint: '52.172.255.132:5001', privateIp: '10.0.1.12', color: 'bg-indigo-500', ring: 'ring-indigo-500/30' },
];

const ALGORITHMS = [
  { name: 'Round Robin',       tag: 'RR',  desc: 'Even sequential distribution' },
  { name: 'Weighted RR',       tag: 'WRR', desc: 'Capacity-aware routing'       },
  { name: 'Least Connections', tag: 'LC',  desc: 'Route to lightest server'     },
  { name: 'IP Hash',           tag: 'IP',  desc: 'Session-sticky affinity'      },
  { name: 'Random',            tag: 'RND', desc: 'Stochastic dispatch'          },
];

const STACK = [
  { label: 'React 18 + Vite 6',   sub: 'SPA + SSE bridge'              },
  { label: 'Three.js / R3F',      sub: 'Isometric 3D cluster'          },
  { label: 'Motion + Lenis',      sub: 'Spring animations'             },
  { label: 'Flask L7 Proxy',      sub: 'Circuit breaker + routing'     },
  { label: 'Azure Central India', sub: '10.0.1.0/24 VNet'             },
  { label: 'Zustand',             sub: 'Shared telemetry state'        },
  { label: 'Recharts + Arc',      sub: 'Ridgeline & heatmap plots'     },
  { label: 'GitHub Actions',      sub: 'CI health & route checks'      },
];

const TEAM = [
  {
    num: '01', name: 'Abhishek', handle: '@AbhishekS04',
    role: 'Frontend · 3D/2D Visualizers · Motion',
    summary: 'Studio visualizer, SSE animation pipeline, browser traffic dispatcher, telemetry monitoring.',
    url: 'https://github.com/AbhishekS04', urlText: 'github.com/AbhishekS04',
  },
  {
    num: '02', name: 'Shyamsundar Barman', handle: 'Cloud & Backend Lead',
    role: 'Azure VNet · Flask Load Balancer · Workers',
    summary: '4-VM Azure cluster, Flask L7 reverse proxy with health checks, backend CI tests.',
    url: 'https://github.com/AbhishekS04/CloudComputingProject/graphs/contributors', urlText: 'Contributors on GitHub',
  },
];

/* ─────────────────────────── small atoms ─────────────────── */

function Tag({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium tracking-wide ${className}`}>
      {children}
    </span>
  );
}

function BentoCard({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function Dot({ className = '' }) {
  return <span className={`w-1.5 h-1.5 rounded-full ${className}`} />;
}

/* ─────────────────────────── page ───────────────────────── */

export default function AboutPage() {
  const [copiedIp, setCopiedIp] = useState(null);

  const handleCopy = (endpoint) => {
    navigator.clipboard?.writeText(endpoint).catch(() => {});
    setCopiedIp(endpoint);
    setTimeout(() => setCopiedIp((c) => (c === endpoint ? null : c)), 1400);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#FAF7F0] dark:bg-[#121212] text-neutral-800 dark:text-neutral-100 font-sans transition-colors duration-200">
      <SystemDesignNavbar />

      {/* ══════════ HERO — BlurScrollReveal ══════════ */}
      <section className="w-full pt-16 sm:pt-24 pb-4 px-4 flex flex-col items-center text-center">
        {/* eyebrow */}
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
          <BrandLogo className="w-3.5 h-3.5" />
          BIFROST · Cloud Computing Project
        </div>

        {/* BlurScrollReveal headline */}
        <BlurScrollReveal
          text="Real requests. Live Azure VMs. Zero black boxes."
          variant="word"
          staggerFactor={0.85}
          animationDuration={0.12}
          className="min-h-0 py-0 w-full max-w-5xl"
          itemClassName="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-950 dark:text-white"
          offset={['start end', 'start 85%']}
        />

        {/* sub-headline */}
        <BlurScrollReveal
          text="A cloud computing teaching platform built on observable infrastructure — not synthetic diagrams."
          variant="line"
          staggerFactor={0.88}
          animationDuration={0.14}
          className="min-h-0 py-0 mt-6 w-full max-w-2xl"
          itemClassName="text-lg sm:text-xl font-normal text-neutral-500 dark:text-neutral-400"
          offset={['start end', 'start 85%']}
        />

        {/* CTA row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 text-sm font-semibold transition-colors"
          >
            <Layers size={15} /> Open Studio <ArrowRight size={14} />
          </Link>
          <a
            href="https://github.com/AbhishekS04/CloudComputingProject"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.12] text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          >
            <CodeSquare size={15} /> GitHub <ArrowUpRight size={13} />
          </a>
        </div>
      </section>

      {/* ══════════ BENTO GRID ══════════ */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-4">

        {/* Row 1 — 3 col: live status + architecture + algo count */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Live fleet status */}
          <BentoCard className="p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Azure Cluster · Central India</p>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                4 VMs
              </span>
            </div>
            <div className="space-y-3">
              {AZURE_NODES.map((n) => {
                const isCopied = copiedIp === n.publicEndpoint;
                return (
                  <div key={n.vm} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${n.color}`} />
                      <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-500 w-10 shrink-0">{n.vm}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{n.name}</p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{n.role}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(n.publicEndpoint)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] font-mono text-[11px] text-neutral-600 dark:text-neutral-300 transition-colors"
                    >
                      {n.publicEndpoint}
                      {isCopied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="opacity-40" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </BentoCard>

          {/* Telemetry stat */}
          <BentoCard className="p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">Telemetry</p>
              <p className="text-4xl font-bold text-neutral-950 dark:text-white tracking-tight">60 FPS</p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Packet queue drain</p>
            </div>
            <div className="mt-6 space-y-2">
              {[
                { label: 'Transport', value: 'SSE /api/stream' },
                { label: 'Dedup key', value: 'request_id' },
                { label: 'Burst cap', value: '2 000 req/run' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 dark:text-neutral-500">{label}</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">{value}</span>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>

        {/* Row 2 — BlurScrollReveal quote + algorithm grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* Architecture lifecycle */}
          <BentoCard className="md:col-span-3 p-6 overflow-auto">
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-5">01 · Request Lifecycle</p>
            <GatewayLifecycleStage />
          </BentoCard>

          {/* Routing algorithms */}
          <BentoCard className="md:col-span-2 p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-5">02 · Routing Algorithms</p>
            <div className="space-y-3">
              {ALGORITHMS.map((a) => (
                <div key={a.tag} className="flex items-center gap-3">
                  <Tag className="bg-neutral-900 dark:bg-white/[0.1] text-white dark:text-neutral-200 w-10 justify-center shrink-0">
                    {a.tag}
                  </Tag>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{a.name}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>

        {/* Row 3 — BlurScrollReveal quote strip */}
        <BentoCard className="p-8 sm:p-12 flex items-center justify-center text-center">
          <BlurScrollReveal
            text="Traffic leaves your browser, crosses the Azure proxy, executes on Ubuntu Flask workers, and streams back at 60 FPS."
            variant="line"
            staggerFactor={0.88}
            animationDuration={0.13}
            className="min-h-0 py-0 w-full"
            itemClassName="text-2xl sm:text-3xl font-semibold text-neutral-800 dark:text-neutral-100"
            offset={['start 80%', 'end 50%']}
          />
        </BentoCard>

        {/* Row 4 — Failover compare + stack */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* Failover */}
          <BentoCard className="md:col-span-3 p-6 overflow-auto">
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">03 · Failover Compare</p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-5">With L7 balancer vs. direct node saturation (--no-lb)</p>
            <FailoverCompareStage />
          </BentoCard>

          {/* Tech stack grid */}
          <BentoCard className="md:col-span-2 p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-5">04 · Tech Stack</p>
            <div className="grid grid-cols-2 gap-2">
              {STACK.map((s) => (
                <div key={s.label} className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2.5">
                  <p className="text-[11.5px] font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">{s.label}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-500 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>

        {/* Row 5 — Interactive strategy workbench */}
        <BentoCard className="p-6">
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">05 · Algorithm Workbench</p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-5">Select a strategy to inspect distribution behavior and trade-offs</p>
          <StrategyWorkbenchStage />
        </BentoCard>

        {/* Row 6 — Team */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TEAM.map((p) => (
            <BentoCard key={p.num} className="p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-base font-semibold text-neutral-950 dark:text-white">{p.name}</p>
                  <p className="font-mono text-xs text-neutral-400 dark:text-neutral-500">{p.handle}</p>
                </div>
                <span className="font-mono text-xs text-neutral-300 dark:text-neutral-600 mt-0.5">{p.num}</span>
              </div>
              <Tag className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-3">
                {p.role}
              </Tag>
              <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 mb-4">{p.summary}</p>
              <a
                href={p.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                {p.urlText} <ArrowUpRight size={11} />
              </a>
            </BentoCard>
          ))}
        </div>

        {/* Row 7 — Final BlurScrollReveal + repo links */}
        <BentoCard className="p-8 sm:p-14 flex flex-col items-center text-center gap-10">
          <BlurScrollReveal
            text="Inspect the source. Dispatch real traffic. Watch it flow."
            variant="word"
            staggerFactor={0.82}
            animationDuration={0.14}
            className="min-h-0 py-0 w-full"
            itemClassName="text-3xl sm:text-4xl font-bold text-neutral-950 dark:text-white"
            offset={['start 85%', 'end 50%']}
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 text-sm font-semibold transition-colors"
            >
              <Layers size={15} /> Open Studio <ArrowRight size={14} />
            </Link>
            <Link
              to="/monitoring"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.12] text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            >
              <ChartBar size={15} /> Monitoring
            </Link>
            <a
              href="https://github.com/AbhishekS04/CloudComputingProject"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.12] text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            >
              <CodeSquare size={15} /> GitHub <ArrowUpRight size={13} />
            </a>
          </div>
        </BentoCard>

      </main>

      <ProgressiveBlur className="fixed bottom-0 z-30" height="64px" position="bottom" />
    </div>
  );
}
