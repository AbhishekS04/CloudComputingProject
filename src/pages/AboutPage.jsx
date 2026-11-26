import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SystemDesignNavbar from '../components/layout/SystemDesignNavbar';
import { RailToc } from '../components/ui/rail-toc';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { BrandLogo } from '../components/ui/BrandLogo';
import {
  GatewayLifecycleStage,
  FailoverCompareStage,
  StrategyWorkbenchStage,
} from '../components/about/AboutStageshows';
import {
  ArrowRight,
  ArrowUpRight,
  BranchUp,
  ChartBar,
  Check,
  CodeSquare,
  Copy,
  Layers,
} from 'reicon-react';

const TOC_ITEMS = [
  { id: 'overview', label: 'Overview', depth: 0 },
  { id: 'architecture', label: 'System Architecture', depth: 0 },
  { id: 'azure-cluster', label: 'Azure VM Cluster', depth: 1 },
  { id: 'telemetry-engine', label: 'SSE & 60 FPS Engine', depth: 1 },
  { id: 'failover-resilience', label: 'Failover & --no-lb', depth: 1 },
  { id: 'algorithms', label: 'Routing Algorithms', depth: 0 },
  { id: 'tech-stack', label: 'Technology Stack', depth: 0 },
  { id: 'team', label: 'Engineering Team', depth: 0 },
  { id: 'repository', label: 'Source & Guides', depth: 0 },
];

const AZURE_NODES = [
  {
    vm: 'LB-VM',
    name: 'L7 Gateway Proxy',
    role: 'Reverse Proxy & Health Probes',
    publicEndpoint: '20.244.34.101:5000',
    privateIp: '172.16.0.4',
    dotClass: 'bg-amber-500',
  },
  {
    vm: 'VM 01',
    name: 'Server A (server-1)',
    role: 'Python Flask Worker',
    publicEndpoint: '52.172.229.225:5001',
    privateIp: '10.0.1.10',
    dotClass: 'bg-blue-500',
  },
  {
    vm: 'VM 02',
    name: 'Server B (server-2)',
    role: 'Python Flask Worker',
    publicEndpoint: '20.193.245.71:5001',
    privateIp: '10.0.1.11',
    dotClass: 'bg-emerald-500',
  },
  {
    vm: 'VM 03',
    name: 'Server C (server-3)',
    role: 'Python Flask Worker',
    publicEndpoint: '52.172.255.132:5001',
    privateIp: '10.0.1.12',
    dotClass: 'bg-indigo-500',
  },
];

const STACK_LEDGER = [
  {
    index: '01',
    group: 'Interface & Motion',
    rows: [
      { label: 'React 18 + Vite 6', value: 'SPA + custom Vite SSE bridge' },
      { label: 'Tailwind CSS 3.4', value: 'Editorial parchment & dark surfaces' },
      { label: 'Motion + Lenis', value: 'Spring drawers & smooth scroll' },
      { label: 'Zustand', value: 'Shared Studio & Monitoring state' },
    ],
  },
  {
    index: '02',
    group: 'Visualizers & Charts',
    rows: [
      { label: 'Three.js / R3F', value: 'Clamped isometric cluster canvas' },
      { label: '2D SVG Topology', value: 'Live request/response arcs' },
      { label: 'SSE /api/stream', value: 'Event-driven telemetry without idle poll' },
      { label: 'Recharts + Arc', value: 'Ridgeline, slope, heatmap & donut plots' },
    ],
  },
  {
    index: '03',
    group: 'Azure Cloud & Dispatcher',
    rows: [
      { label: 'Flask L7 Proxy', value: 'Algorithm routing + circuit breaker' },
      { label: 'Azure Central India', value: '4 Ubuntu VMs across 10.0.1.0/24' },
      { label: 'sendTraffic.js', value: 'In-browser Burst, Stream & Attack runner' },
      { label: 'GitHub Actions', value: 'Backend route & health test checks' },
    ],
  },
];

const TEAM_CREDITS = [
  {
    num: '01',
    name: 'Abhishek',
    handle: '@AbhishekS04',
    role: 'Frontend Systems, 3D/2D Visualizers & Motion Engineering',
    summary:
      'Engineered the Studio visualizer, event-driven SSE packet animation pipeline, browser traffic dispatcher, and telemetry monitoring pages.',
    githubUrl: 'https://github.com/AbhishekS04',
    githubText: 'github.com/AbhishekS04',
  },
  {
    num: '02',
    name: 'Shyamsundar Barman',
    handle: 'Cloud & Backend Lead',
    role: 'Azure VNet Provisioning, Flask Load Balancer & Backend Workers',
    summary:
      'Deployed the 4-VM Azure Central India cluster, authored the Flask L7 reverse proxy with active health checks, and configured backend CI tests.',
    githubUrl: 'https://github.com/AbhishekS04/CloudComputingProject/graphs/contributors',
    githubText: 'Contributors on GitHub',
  },
];

function SectionHeading({ index, title, caption }) {
  return (
    <div className="mb-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500">
        {index}
      </div>
      <h2 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
        {title}
      </h2>
      {caption && (
        <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-300 max-w-2xl leading-relaxed">
          {caption}
        </p>
      )}
    </div>
  );
}

export default function AboutPage() {
  const [copiedIp, setCopiedIp] = useState(null);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const handleCopyEndpoint = (endpoint) => {
    navigator.clipboard?.writeText(endpoint).catch(() => {});
    setCopiedIp(endpoint);
    window.setTimeout(() => setCopiedIp((cur) => (cur === endpoint ? null : cur)), 1400);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#FAF7F0] dark:bg-[#121212] text-neutral-800 dark:text-neutral-100 font-sans transition-colors duration-200">
      <SystemDesignNavbar />

      {/* Mobile & Tablet Quick Section Strip */}
      <div className="lg:hidden sticky top-16 z-30 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#FAF7F0]/90 dark:bg-[#121212]/90 backdrop-blur-md">
        <div className="max-w-[1380px] mx-auto px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {TOC_ITEMS.filter((item) => item.depth === 0).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 w-full max-w-[1380px] mx-auto px-4 sm:px-6 pt-8 pb-20 sm:py-12 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-10 xl:gap-14 items-start">
          {/* Left Sticky RailToc — Unchanged */}
          <aside className="hidden lg:block sticky top-24 self-start pl-1">
            <RailToc items={TOC_ITEMS} offset={104} title="On this page" />
          </aside>

          {/* Right Editorial & Stageshow Body */}
          <div className="min-w-0 max-w-4xl space-y-16 sm:space-y-20">
            {/* 1. Overview Masthead */}
            <section id="overview" className="scroll-mt-24">
              <div className="flex items-center gap-3.5 mb-5">
                <BrandLogo className="w-10 h-10 sm:w-12 sm:h-12" />
                <div className="min-w-0">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400 truncate">
                    BIFROST · Azure Central India L7 Balancer
                  </div>
                  <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
                    20.244.34.101:5000 · Event-Driven Architecture
                  </div>
                </div>
              </div>

              <h1 className="text-3xl sm:text-[42px] font-semibold tracking-tight text-neutral-950 dark:text-white leading-[1.1]">
                Real requests through live Azure VMs. Zero black boxes.
              </h1>

              <p className="mt-4 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 max-w-2xl">
                BIFROST replaces synthetic textbook diagrams with observable cloud routing. Traffic leaves your browser via{' '}
                <code className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] font-mono text-xs text-neutral-900 dark:text-neutral-100">
                  sendTraffic.js
                </code>
                , crosses the Azure LB-VM proxy, executes on Ubuntu Flask workers, and returns over Server-Sent Events directly into a 60 FPS canvas.
              </p>

              {/* Editorial Key-Metric Ruled Bar (No Boxed Cards) */}
              <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3 border-y border-black/[0.08] dark:border-white/[0.09] divide-y sm:divide-y-0 sm:divide-x divide-black/[0.08] dark:divide-white/[0.09]">
                <div className="py-4 sm:pr-6">
                  <dt className="font-mono text-[10.5px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Active Fleet
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-neutral-950 dark:text-white tabular-nums">
                    4 Azure VMs
                  </dd>
                  <dd className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    1 L7 proxy + 3 Ubuntu backend nodes
                  </dd>
                </div>

                <div className="py-4 sm:px-6">
                  <dt className="font-mono text-[10.5px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Telemetry Transport
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-neutral-950 dark:text-white">
                    SSE /api/stream
                  </dd>
                  <dd className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    Deduplicated live dots when traffic runs
                  </dd>
                </div>

                <div className="py-4 sm:pl-6">
                  <dt className="font-mono text-[10.5px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Viewport Renderers
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-neutral-950 dark:text-white">
                    3D &amp; 2D Synchronized
                  </dd>
                  <dd className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    Shared Zustand store across views
                  </dd>
                </div>
              </dl>
            </section>

            {/* 2. System Architecture & Live Stageshow */}
            <section id="architecture" className="scroll-mt-24 pt-10 border-t border-black/[0.07] dark:border-white/[0.08]">
              <SectionHeading
                index="01 · Architecture"
                title="End-to-End Request Lifecycle"
                caption="Step through how a browser HTTP request traverses the Azure proxy, selects a worker, and publishes its SSE confirmation back to the Studio."
              />

              {/* Sub-section: Azure VM Cluster */}
              <div id="azure-cluster" className="scroll-mt-24 space-y-6">
                <GatewayLifecycleStage />

                {/* Clean Ruled Fleet Endpoint Index */}
                <div className="pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.08] dark:border-white/[0.09] text-[10.5px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    <span>Cluster Node</span>
                    <span>Endpoint · VNet</span>
                  </div>
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                    {AZURE_NODES.map((node) => {
                      const isCopied = copiedIp === node.publicEndpoint;
                      return (
                        <div
                          key={node.vm}
                          className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${node.dotClass}`} />
                            <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-500 w-12 shrink-0">
                              {node.vm}
                            </span>
                            <span className="font-medium text-neutral-950 dark:text-white truncate">
                              {node.name}
                            </span>
                            <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">
                              — {node.role}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyEndpoint(node.publicEndpoint)}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.11] text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                              title="Copy public endpoint"
                            >
                              <span>{node.publicEndpoint}</span>
                              {isCopied ? (
                                <Check size={11} className="text-emerald-500" />
                              ) : (
                                <Copy size={11} className="opacity-55" />
                              )}
                            </button>
                            <span className="text-neutral-400 dark:text-neutral-500 text-[11px]">
                              {node.privateIp}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sub-section: Telemetry Engine */}
              <div id="telemetry-engine" className="scroll-mt-24 mt-12 pt-8 border-t border-black/[0.06] dark:border-white/[0.08]">
                <h3 className="text-base sm:text-lg font-semibold text-neutral-950 dark:text-white">
                  SSE Deduplication &amp; 60 FPS Queue Pacing
                </h3>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="border-l-2 border-blue-500/60 pl-4">
                    <div className="text-xs font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      Strict Live Correspondence
                    </div>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                      Every particle spawned in Live Azure mode maps to an HTTP response or{' '}
                      <code className="font-mono text-xs">/api/stream</code> SSE frame, deduplicated by{' '}
                      <code className="font-mono text-xs">request_id</code> so no duplicate phantom packets appear.
                    </p>
                  </div>

                  <div className="border-l-2 border-emerald-500/60 pl-4">
                    <div className="text-xs font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      Visual Cap Without Metric Loss
                    </div>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                      During 500–2,000 request bursts, aggregate totals and latencies stay 100% exact while the renderer drains queued animations cleanly inside pre-allocated 60 FPS pools.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-section: Interactive Failover Stageshow */}
              <div id="failover-resilience" className="scroll-mt-24 mt-12 pt-8 border-t border-black/[0.06] dark:border-white/[0.08]">
                <div className="mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-neutral-950 dark:text-white">
                    With L7 Balancer vs. Direct Node Saturation (--no-lb)
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                    Toggle below to compare hitting one VM directly versus distributing traffic and rerouting cleanly on failure.
                  </p>
                </div>
                <FailoverCompareStage />
              </div>
            </section>

            {/* 3. Interactive Routing Algorithms Workbench */}
            <section id="algorithms" className="scroll-mt-24 pt-10 border-t border-black/[0.07] dark:border-white/[0.08]">
              <SectionHeading
                index="02 · Algorithms"
                title="Routing Strategies"
                caption="Select a strategy to inspect its distribution behavior, session affinity, and operational trade-off."
              />
              <StrategyWorkbenchStage />
            </section>

            {/* 4. Architectural Tech Ledger */}
            <section id="tech-stack" className="scroll-mt-24 pt-10 border-t border-black/[0.07] dark:border-white/[0.08]">
              <SectionHeading
                index="03 · Stack"
                title="System Architecture &amp; Tooling"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {STACK_LEDGER.map((col) => (
                  <div key={col.index} className="border-t-2 border-neutral-900 dark:border-white/80 pt-3">
                    <div className="flex items-center justify-between text-xs font-mono text-neutral-400 dark:text-neutral-500">
                      <span>{col.index}</span>
                      <span className="uppercase tracking-wider">{col.group}</span>
                    </div>
                    <dl className="mt-4 divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                      {col.rows.map((row) => (
                        <div key={row.label} className="py-2.5">
                          <dt className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            {row.label}
                          </dt>
                          <dd className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>

            {/* 5. Engineering Credits (Clean Editorial List — No Initials Boxes) */}
            <section id="team" className="scroll-mt-24 pt-10 border-t border-black/[0.07] dark:border-white/[0.08]">
              <SectionHeading
                index="04 · Contributors"
                title="Built By"
              />

              <div className="border-t border-black/[0.08] dark:border-white/[0.09] divide-y divide-black/[0.08] dark:divide-white/[0.09]">
                {TEAM_CREDITS.map((person) => (
                  <div
                    key={person.num}
                    className="py-5 grid grid-cols-1 sm:grid-cols-[40px_1fr_auto] gap-3 sm:gap-5 items-start"
                  >
                    <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500 pt-1">
                      {person.num}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2.5">
                        <h3 className="text-base font-semibold text-neutral-950 dark:text-white">
                          {person.name}
                        </h3>
                        <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">
                          {person.handle}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                        {person.role}
                      </p>
                      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 max-w-xl">
                        {person.summary}
                      </p>
                    </div>

                    <a
                      href={person.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-600 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white transition-colors shrink-0 pt-1"
                    >
                      <span>{person.githubText}</span>
                      <ArrowUpRight size={12} />
                    </a>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. Source & Launchpad */}
            <section id="repository" className="scroll-mt-24 pt-10 border-t border-black/[0.07] dark:border-white/[0.08] pb-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    <BranchUp size={14} className="text-emerald-500" />
                    <span>AbhishekS04 / CloudComputingProject</span>
                  </div>
                  <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-300 max-w-lg">
                    Inspect the browser dispatcher in <code className="font-mono text-xs">src/lib/sendTraffic.js</code> or jump straight into live telemetry.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    to="/"
                    data-cuelume-navigate
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-semibold transition-colors"
                  >
                    <Layers size={14} />
                    <span>Open Studio</span>
                    <ArrowRight size={13} />
                  </Link>
                  <Link
                    to="/monitoring"
                    data-cuelume-navigate
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/[0.1] dark:border-white/[0.12] text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <ChartBar size={14} />
                    <span>Monitoring</span>
                  </Link>
                  <a
                    href="https://github.com/AbhishekS04/CloudComputingProject"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/[0.1] dark:border-white/[0.12] text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <CodeSquare size={14} />
                    <span>GitHub</span>
                    <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <ProgressiveBlur className="fixed bottom-0 z-30" height="64px" position="bottom" />
    </div>
  );
}
