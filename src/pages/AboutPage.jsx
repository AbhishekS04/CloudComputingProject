import React from 'react';
import { Link } from 'react-router-dom';
import SystemDesignNavbar from '../components/layout/SystemDesignNavbar';
import { RailToc } from '../components/ui/rail-toc';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BranchUp,
  ChartBar,
  CheckCircle,
  Cloud,
  Code2,
  CodeSquare,
  Cpu,
  Flash,
  Globe,
  Layers,
  Nodes,
  Radio,
  Server,
  ShieldAlert,
  ShieldCheck,
  BrowserTerminal,
  Users,
} from 'reicon-react';
import { DuotoneIcon } from '../components/ui/DuotoneIcon';
import { BrandLogo } from '../components/ui/BrandLogo';

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
    name: 'L7 Gateway / Load Balancer',
    role: 'Online Azure Proxy & Health Probes',
    publicEndpoint: '20.244.34.101:5000',
    privateIp: '172.16.0.4',
    accent: 'text-amber-600 dark:text-amber-400',
    badge: 'Gateway',
  },
  {
    vm: 'VM 2',
    name: 'Server A (server-1)',
    role: 'Python Flask Worker',
    publicEndpoint: '52.172.229.225:5001',
    privateIp: '10.0.1.10',
    accent: 'text-blue-600 dark:text-blue-400',
    badge: 'Central India',
  },
  {
    vm: 'VM 3',
    name: 'Server B (server-2)',
    role: 'Python Flask Worker',
    publicEndpoint: '20.193.245.71:5001',
    privateIp: '10.0.1.11',
    accent: 'text-emerald-600 dark:text-emerald-400',
    badge: 'Central India',
  },
  {
    vm: 'VM 4',
    name: 'Server C (server-3)',
    role: 'Python Flask Worker',
    publicEndpoint: '52.172.255.132:5001',
    privateIp: '10.0.1.12',
    accent: 'text-violet-600 dark:text-violet-400',
    badge: 'Central India',
  },
];

const ALGORITHMS = [
  {
    name: 'Round Robin',
    complexity: 'O(1)',
    affinity: 'None',
    scope: 'Live LB & Sim',
    summary:
      'Cycles sequentially across healthy backend nodes in rotation. Ideal when VMs have uniform CPU/memory capacity and stateless HTTP workloads.',
    tradeoff: 'Does not account for slow outlier requests or uneven CPU saturation.',
  },
  {
    name: 'Least Connections',
    complexity: 'O(N)',
    affinity: 'Dynamic',
    scope: 'Live LB & Sim',
    summary:
      'Inspects active in-flight connections on every healthy worker and dispatches incoming traffic to the least loaded node.',
    tradeoff: 'Superior under heterogeneous compute times or sudden localized stalls.',
  },
  {
    name: 'IP Hash',
    complexity: 'O(1)',
    affinity: 'Sticky Session',
    scope: 'Live LB & Sim',
    summary:
      'Deterministically hashes the source client IP modulo healthy node count so a given client maps consistently to the same VM.',
    tradeoff: 'Can create uneven hot-spots if a single NAT gateway sends high traffic.',
  },
  {
    name: 'Weighted Round Robin',
    complexity: 'O(1)',
    affinity: 'Proportional',
    scope: 'Simulation Studio',
    summary:
      'Distributes requests proportionally to configured node weights (e.g., 2x capacity servers receive double the request share).',
    tradeoff: 'Requires manual or telemetry-driven tuning when VM tiers differ.',
  },
];

const TECH_STACK = [
  {
    category: 'Frontend & Motion',
    icon: Layers,
    items: [
      { name: 'React 18 + Vite 6', detail: 'SPA with custom Vite SSE bridge middleware' },
      { name: 'Tailwind CSS', detail: 'Warm cream editorial & dark system palette' },
      { name: 'Motion & Lenis', detail: 'Smooth scroll, Venetian blinds & blur-fade theme transitions' },
      { name: 'Zustand', detail: 'Unified state sync across Studio, Monitoring & Navbar' },
    ],
  },
  {
    category: 'Visualization & Telemetry',
    icon: Cpu,
    items: [
      { name: 'Three.js / R3F', detail: 'Interactive 3D isometric cluster canvas with clamped zoom' },
      { name: '2D SVG Topology', detail: 'Smooth Bezier request/response streams & node badges' },
      { name: 'Server-Sent Events', detail: 'Zero-polling live traffic stream (/api/stream)' },
      { name: 'Recharts & Arc Primitives', detail: 'Ridgeline, slope, heatmap, donut & percentile telemetry' },
    ],
  },
  {
    category: 'Backend & Azure Cloud',
    icon: Cloud,
    items: [
      { name: 'Python Flask Gateway', detail: 'L7 reverse proxy, active health checks & node drain API' },
      { name: 'Azure Virtual Machines', detail: 'Dedicated Central India VNet (10.0.1.0/24) backend fleet' },
      { name: 'Browser Traffic Engine', detail: 'sendTraffic.js dispatching bursts, stress tests & No-LB directly from UI' },
      { name: 'GitHub Actions CI', detail: 'Automated backend unit tests & health verification' },
    ],
  },
];

const TEAM_MEMBERS = [
  {
    name: 'Abhishek',
    handle: '@AbhishekS04',
    initials: 'AS',
    role: 'Frontend Architecture, 3D/2D Visualizer & Motion Engineering',
    bio: 'Designed the BIFROST Studio visualizer, event-driven particle animation pipeline, monitoring charts, and interactive real-time Azure telemetry interface.',
    highlights: [
      '3D Isometric & 2D SVG Topology Engines',
      'Event-Driven SSE Packet Visualizer',
      'Monitoring Telemetry & Editorial UI',
    ],
    githubUrl: 'https://github.com/AbhishekS04',
    githubLabel: 'github.com/AbhishekS04',
    accentBg: 'from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300',
    accentText: 'text-white dark:text-neutral-900',
  },
  {
    name: 'Shyamsundar Barman',
    handle: 'Cloud & Backend Lead',
    initials: 'SB',
    role: 'Azure Infrastructure, Python Load Balancer & Distributed Workers',
    bio: 'Provisioned the Microsoft Azure Central India VM cluster, engineered the Flask L7 load balancer with health probes and algorithm routing, and authored backend tests and CI workflows.',
    highlights: [
      'Azure Central India Multi-VM VNet Setup',
      'Flask L7 Gateway (RR / Least Conn / IP Hash)',
      'Backend Health Checks & CI Pipeline',
    ],
    githubUrl: 'https://github.com/AbhishekS04/CloudComputingProject/graphs/contributors',
    githubLabel: 'Project Contributors on GitHub',
    accentBg: 'from-emerald-700 to-emerald-500 dark:from-emerald-400 dark:to-emerald-600',
    accentText: 'text-white dark:text-neutral-950',
  },
];

function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-5">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
        {eyebrow}
      </span>
      <h2 className="mt-1.5 text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function AboutPage() {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#FAF7F0] dark:bg-[#121212] text-neutral-800 dark:text-neutral-100 font-sans transition-colors duration-200">
      <SystemDesignNavbar />

      {/* Mobile & Tablet Quick Navigation Strip */}
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
          {/* Left Sticky RailToc */}
          <aside className="hidden lg:block sticky top-24 self-start pl-1">
            <RailToc items={TOC_ITEMS} offset={104} title="On this page" />
          </aside>

          {/* Main Knowledge & Team Content */}
          <div className="min-w-0 max-w-4xl space-y-14 sm:space-y-16">
            {/* 1. Overview */}
            <section id="overview" className="scroll-mt-24">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <BrandLogo className="w-10 h-10 sm:w-11 sm:h-11" />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Computing · Distributed L7 Load Balancing Platform
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-white leading-[1.15]">
                Understanding distributed traffic through live Azure infrastructure.
              </h1>

              <p className="mt-4 text-base sm:text-[17px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                <strong className="font-semibold text-neutral-900 dark:text-white">BIFROST</strong> is an
                interactive cloud load balancing visualizer and telemetry suite built to make Layer 7 traffic
                routing, health probing, and node failover observable in real time. Rather than relying solely on
                static textbook diagrams, BIFROST pairs a 60 FPS 3D/2D network canvas with live Python worker
                instances deployed on Microsoft Azure Virtual Machines.
              </p>

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="rounded-2xl bg-white/80 dark:bg-[#191B1F]/90 border border-black/[0.06] dark:border-white/[0.08] p-4 shadow-subtle">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    <DuotoneIcon icon={Cloud} size={15} className="text-blue-500" secondaryOpacity={0.26} />
                    Azure Fleet
                  </div>
                  <p className="mt-2 text-xl font-semibold text-neutral-900 dark:text-white tabular-nums">
                    4 VMs · 10.0.1.0/24
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    1 L7 Gateway + 3 Central India workers
                  </p>
                </div>

                <div className="rounded-2xl bg-white/80 dark:bg-[#191B1F]/90 border border-black/[0.06] dark:border-white/[0.08] p-4 shadow-subtle">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    <DuotoneIcon icon={Radio} size={15} className="text-emerald-500" secondaryOpacity={0.26} />
                    Telemetry Bus
                  </div>
                  <p className="mt-2 text-xl font-semibold text-neutral-900 dark:text-white">
                    Event-Driven SSE
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Zero fake browser packets in Live Azure mode
                  </p>
                </div>

                <div className="rounded-2xl bg-white/80 dark:bg-[#191B1F]/90 border border-black/[0.06] dark:border-white/[0.08] p-4 shadow-subtle">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    <DuotoneIcon icon={Nodes} size={15} className="text-amber-500" secondaryOpacity={0.26} />
                    Dual Visualizer
                  </div>
                  <p className="mt-2 text-xl font-semibold text-neutral-900 dark:text-white">
                    3D Isometric & 2D
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Synchronized live state & monitoring charts
                  </p>
                </div>
              </div>
            </section>

            {/* 2. System Architecture */}
            <section id="architecture" className="scroll-mt-24 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <SectionHeader
                eyebrow="01 · Architecture"
                title="End-to-End Request Lifecycle"
                subtitle="How CLI traffic, the L7 gateway, real Azure Virtual Machines, and the browser visualizer synchronize without polling overhead."
              />

              {/* Sub-section: Azure VM Cluster */}
              <div id="azure-cluster" className="scroll-mt-24 mt-6">
                <h3 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <DuotoneIcon icon={Server} size={17} className="text-blue-500" secondaryOpacity={0.25} />
                  Azure Central India Cluster Topology
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  Traffic triggered directly from the <code className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] font-mono text-xs">sendTraffic.js</code> browser dispatcher enters the
                  online Azure LB-VM gateway (<code className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] font-mono text-xs">20.244.34.101:5000</code>), which selects a healthy worker inside the virtual network,
                  measures end-to-end RTT, and streams real-time events over Server-Sent Events (SSE).
                </p>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#191B1F]/90 shadow-subtle">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[11px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        <th className="py-3 px-4">Node</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Public Endpoint</th>
                        <th className="py-3 px-4">VNet IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {AZURE_NODES.map((node) => (
                        <tr key={node.vm} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-medium text-neutral-900 dark:text-white whitespace-nowrap">
                            <span className={`font-mono text-xs mr-2 ${node.accent}`}>{node.vm}</span>
                            {node.name}
                          </td>
                          <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                            {node.role}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                            {node.publicEndpoint}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                            {node.privateIp}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub-section: Telemetry Engine */}
              <div id="telemetry-engine" className="scroll-mt-24 mt-9">
                <h3 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <DuotoneIcon icon={Activity} size={17} className="text-emerald-500" secondaryOpacity={0.25} />
                  SSE Streaming & 60 FPS Packet Pacing
                </h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/80 dark:bg-[#191B1F]/90 border border-black/[0.06] dark:border-white/[0.08] p-5 shadow-subtle">
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                      <DuotoneIcon icon={Flash} size={16} className="text-amber-500" secondaryOpacity={0.32} />
                      Real-Time Azure Mode
                    </div>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                      Every particle animated on the canvas corresponds to a real TCP/HTTP request routed through the gateway
                      or Vite telemetry bridge (<code className="font-mono text-xs">/__bridge/stream</code>). When no CLI workload runs,
                      the cluster stays authentically idle.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/80 dark:bg-[#191B1F]/90 border border-black/[0.06] dark:border-white/[0.08] p-5 shadow-subtle">
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                      <DuotoneIcon icon={Cpu} size={16} className="text-blue-500" secondaryOpacity={0.25} />
                      Bounded Visual Queues
                    </div>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                      During 1,000+ request stress tests, raw packet counts and server CPU metrics update accurately while the visual
                      renderer caps concurrent animated dots so Bezier trajectories remain silky-smooth at 60 FPS without DOM/GPU lag.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-section: Failover & --no-lb */}
              <div id="failover-resilience" className="scroll-mt-24 mt-9">
                <h3 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <DuotoneIcon icon={ShieldCheck} size={17} className="text-emerald-500" secondaryOpacity={0.25} />
                  Why Load Balancing Prevents Cascading Crashes
                </h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] dark:bg-rose-500/[0.06] p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
                      <DuotoneIcon icon={ShieldAlert} size={16} secondaryOpacity={0.25} />
                      Without Load Balancer (--no-lb)
                    </div>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                      Requests bypass the gateway and hit a single randomly chosen Azure VM directly. Under burst concurrency,
                      that node&apos;s CPU saturates to 100%, latency spikes, and requests fail with timeouts or crashes while sibling VMs sit idle.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      <DuotoneIcon icon={CheckCircle} size={16} secondaryOpacity={0.25} />
                      With L7 Load Balancer & Health Probes
                    </div>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                      Traffic spreads across all healthy nodes simultaneously. If a VM fails or is drained, active health probes
                      evict it from rotation immediately and reroute incoming requests to surviving workers with zero dropped flows.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Routing Algorithms */}
            <section id="algorithms" className="scroll-mt-24 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <SectionHeader
                eyebrow="02 · Algorithms"
                title="Load Balancing Strategies Implemented"
                subtitle="Switch algorithms live from the Studio toolbar or gateway API and observe how distribution, CPU load, and latency percentiles respond."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ALGORITHMS.map((algo) => (
                  <div
                    key={algo.name}
                    className="rounded-2xl bg-white/80 dark:bg-[#191B1F]/90 border border-black/[0.06] dark:border-white/[0.08] p-5 shadow-subtle flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                          {algo.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-black/[0.05] dark:bg-white/[0.08] text-neutral-700 dark:text-neutral-300">
                          {algo.complexity}
                        </span>
                      </div>
                      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {algo.summary}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.06] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                        <span>Session Affinity</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{algo.affinity}</span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                        <span>Execution Scope</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{algo.scope}</span>
                      </div>
                      <p className="pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">Trade-off:</span> {algo.tradeoff}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Technology Stack */}
            <section id="tech-stack" className="scroll-mt-24 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <SectionHeader
                eyebrow="03 · Stack"
                title="Built with Modern Web & Cloud Tooling"
                subtitle="Designed for clarity, responsive performance, and verifiable distributed-systems instrumentation."
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TECH_STACK.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div
                      key={group.category}
                      className="rounded-2xl bg-white/80 dark:bg-[#191B1F]/90 border border-black/[0.06] dark:border-white/[0.08] p-5 shadow-subtle"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                        <Icon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                        {group.category}
                      </div>
                      <ul className="mt-4 space-y-3">
                        {group.items.map((item) => (
                          <li key={item.name}>
                            <div className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {item.name}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5">
                              {item.detail}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 5. Engineering Team */}
            <section id="team" className="scroll-mt-24 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <SectionHeader
                eyebrow="04 · Team"
                title="People Behind BIFROST"
                subtitle="Cloud computing engineering, distributed system instrumentation, and interactive frontend design."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEAM_MEMBERS.map((member) => (
                  <article
                    key={member.name}
                    className="rounded-2xl bg-white/85 dark:bg-[#191B1F]/90 border border-black/[0.06] dark:border-white/[0.08] p-5 sm:p-6 shadow-subtle flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${member.accentBg} ${member.accentText} flex items-center justify-center font-semibold text-sm shrink-0 shadow-xs`}
                          >
                            {member.initials}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-neutral-900 dark:text-white leading-tight">
                              {member.name}
                            </h3>
                            <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
                              {member.handle}
                            </p>
                          </div>
                        </div>

                        <a
                          href={member.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-neutral-700 dark:text-neutral-200 transition-colors shrink-0"
                        >
                          <CodeSquare size={14} />
                          <span>GitHub</span>
                          <ArrowUpRight size={12} className="opacity-60" />
                        </a>
                      </div>

                      <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {member.role}
                      </p>

                      <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {member.bio}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {member.highlights.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1.5">
                        <Users size={14} />
                        Core Contributor
                      </span>
                      <a
                        href={member.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono hover:text-neutral-900 dark:hover:text-white transition-colors truncate max-w-[210px]"
                      >
                        {member.githubLabel}
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 6. Source & Guides */}
            <section id="repository" className="scroll-mt-24 pt-2 border-t border-black/[0.06] dark:border-white/[0.08] pb-12">
              <SectionHeader
                eyebrow="05 · Resources"
                title="Explore the Codebase & Live Cluster"
                subtitle="Inspect the repository, run terminal stress tests against Azure VMs, or jump back into the live Studio and Monitoring views."
              />

              <div className="rounded-2xl bg-white/85 dark:bg-[#191B1F]/90 border border-black/[0.06] dark:border-white/[0.08] p-5 sm:p-6 shadow-subtle">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                      <DuotoneIcon icon={BranchUp} size={16} className="text-emerald-500" secondaryOpacity={0.25} />
                      AbhishekS04 / CloudComputingProject
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                      Includes the React/Three.js visualizer, Python Flask gateway & workers, Azure setup guide, and live CLI stress scripts.
                    </p>
                  </div>

                  <a
                    href="https://github.com/AbhishekS04/CloudComputingProject"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-colors shrink-0"
                  >
                    <CodeSquare size={14} />
                    <span>View Repository</span>
                    <ArrowUpRight size={12} className="opacity-70" />
                  </a>
                </div>

                <div className="mt-5 pt-5 border-t border-black/[0.06] dark:border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-3">
                    <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                      <DuotoneIcon icon={BrowserTerminal} size={15} className="text-amber-500" secondaryOpacity={0.24} />
                      Browser Traffic Scenarios
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                      src/lib/sendTraffic.js (In-Browser)
                    </p>
                  </div>

                  <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-3">
                    <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                      <DuotoneIcon icon={Code2} size={15} className="text-blue-500" secondaryOpacity={0.24} />
                      Azure Cluster Guide
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                      AZURE_CLUSTER_DEVELOPER_GUIDE.md
                    </p>
                  </div>

                  <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-3">
                    <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                      <DuotoneIcon icon={Globe} size={15} className="text-emerald-500" secondaryOpacity={0.24} />
                      Live Gateway Endpoint
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                      20.244.34.101:5000 → 172.16.0.4
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-black/[0.05] hover:bg-black/[0.09] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-neutral-900 dark:text-white transition-colors"
                  >
                    <DuotoneIcon icon={Layers} size={15} secondaryOpacity={0.22} />
                    <span>Open Visualizer Studio</span>
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    to="/monitoring"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-black/[0.05] hover:bg-black/[0.09] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-neutral-900 dark:text-white transition-colors"
                  >
                    <DuotoneIcon icon={ChartBar} size={15} secondaryOpacity={0.22} />
                    <span>Inspect Cluster Monitoring</span>
                    <ArrowRight size={14} />
                  </Link>
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
