import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { RailToc } from '@/components/ui/rail-toc';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartBar,
  Check,
  CodeSquare,
  Copy,
  Layers,
  Server,
  TerminalSquare,
  Users,
} from 'reicon-react';

/* ─────────────────────────── Verified Project Data ─────────────────────────── */

const TOC_ITEMS = [
  { id: 'overview', label: 'Overview', depth: 0 },
  { id: 'topology', label: 'Cluster Topology', depth: 0 },
  { id: 'azure-nodes', label: 'Node Inventory', depth: 1 },
  { id: 'algorithms', label: 'Routing Algorithms', depth: 0 },
  { id: 'failover', label: 'Health Checks & Failover', depth: 0 },
  { id: 'api', label: 'Gateway API', depth: 0 },
  { id: 'setup', label: 'Local Setup & Env', depth: 0 },
  { id: 'env-vars', label: 'Environment Variables', depth: 1 },
  { id: 'repo-docs', label: 'Repository Guides', depth: 1 },
  { id: 'stack', label: 'Tech Stack', depth: 0 },
  { id: 'contributors', label: 'Contributors', depth: 0 },
];

const AZURE_NODES = [
  {
    id: 'lb-vm',
    name: 'LB-VM Gateway',
    role: 'Flask L7 Reverse Proxy & Health Probe',
    publicEndpoint: '20.244.34.101:5000',
    privateIp: '172.16.0.4',
    proxyPath: '/lb-api',
  },
  {
    id: 'server-1',
    name: 'Server A (server-1)',
    role: 'Ubuntu Flask Worker',
    publicEndpoint: '52.172.229.225:5001',
    privateIp: '10.0.1.10',
    proxyPath: '/vm-api/server-1',
  },
  {
    id: 'server-2',
    name: 'Server B (server-2)',
    role: 'Ubuntu Flask Worker',
    publicEndpoint: '20.193.245.71:5001',
    privateIp: '10.0.1.11',
    proxyPath: '/vm-api/server-2',
  },
  {
    id: 'server-3',
    name: 'Server C (server-3)',
    role: 'Ubuntu Flask Worker',
    publicEndpoint: '52.172.255.132:5001',
    privateIp: '10.0.1.12',
    proxyPath: '/vm-api/server-3',
  },
];

const TOPOLOGY_ASCII = `Client / Browser / CLI
        │  HTTP (20.244.34.101:5000 or /lb-api proxy)
        ▼
┌────────────────────────────────────────────────────────┐
│  Azure LB-VM · Flask L7 Gateway (172.16.0.4:5000)      │
│  Routing: round_robin | least_connections | ip_hash    │
│  Probes : GET /health every 2.5s · Max conns: 12/node  │
└───────┬───────────────────────┬────────────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   Server A    │       │   Server B    │       │   Server C    │
│ 52.172.229.225│       │ 20.193.245.71 │       │ 52.172.255.132│
│   10.0.1.10   │       │   10.0.1.11   │       │   10.0.1.12   │
│   Port 5001   │       │   Port 5001   │       │   Port 5001   │
└───────────────┘       └───────────────┘       └───────────────┘`;

const ALGORITHMS = [
  {
    key: 'round_robin',
    name: 'Round Robin',
    complexity: 'O(1)',
    affinity: 'None',
    scope: 'Live LB + Studio',
    behavior: 'Cycles sequentially through healthy workers using a thread-safe rotating index.',
  },
  {
    key: 'least_connections',
    name: 'Least Connections',
    complexity: 'O(N)',
    affinity: 'Dynamic',
    scope: 'Live LB + Studio',
    behavior: 'Inspects active_connections across healthy servers and dispatches to the lightest node.',
  },
  {
    key: 'ip_hash',
    name: 'IP Hash',
    complexity: 'O(1)',
    affinity: 'Sticky IP',
    scope: 'Live LB + Studio',
    behavior: 'Hashes source client IP modulo healthy pool length so repeat clients hit the same VM.',
  },
  {
    key: 'weighted_round_robin',
    name: 'Weighted Round Robin',
    complexity: 'O(N)',
    affinity: 'Proportional',
    scope: 'Simulation Studio',
    behavior: 'Distributes requests in proportion to configured per-server capacity weights.',
  },
  {
    key: 'random',
    name: 'Random',
    complexity: 'O(1)',
    affinity: 'None',
    scope: 'Simulation Studio',
    behavior: 'Uniform random selection across healthy servers with zero routing state.',
  },
];

const API_ENDPOINTS = [
  { method: 'GET', path: '/health', desc: 'Gateway status, active algorithm, healthy/total counts, and VNet metadata.' },
  { method: 'GET', path: '/gateway-health', desc: 'Lightweight gateway health and pause state check.' },
  { method: 'POST', path: '/api/request', desc: 'Routes a request to a healthy backend worker (/api/process alias). Accepts { clientIp, delay }.' },
  { method: 'GET', path: '/api/servers', desc: 'Returns all registered backend VMs, health status, active connections, and latency stats.' },
  { method: 'POST', path: '/api/servers/<id>/toggle', desc: 'Drains or restores a specific backend worker node from the active pool.' },
  { method: 'POST', path: '/api/servers/recover', desc: 'Recovers all disabled or circuit-broken backend nodes back into rotation.' },
  { method: 'POST', path: '/api/algorithm', desc: 'Switches active routing algorithm (round_robin, least_connections, ip_hash).' },
  { method: 'POST', path: '/api/lb/toggle', desc: 'Pauses or resumes request routing on the gateway (returns 503 while paused).' },
  { method: 'GET', path: '/api/stats', desc: 'Cluster-wide totals: requests, successes, failures, average latency, and lb_paused.' },
  { method: 'GET', path: '/api/logs?limit=100', desc: 'Recent request dispatch log entries (ring buffer capped at 500 records).' },
  { method: 'GET', path: '/api/stream', desc: 'Server-Sent Events (SSE) stream emitting request, server_update, algorithm, and lb_toggle events.' },
];

const ENV_VARS = [
  { scope: 'Frontend (.env)', name: 'VITE_API_BASE_URL', defaultVal: 'http://20.244.34.101:5000', desc: 'Target Load Balancer gateway URL for local browser sessions.' },
  { scope: 'Frontend (.env)', name: 'VITE_CLUSTER_MODE', defaultVal: 'live', desc: 'Default mode on load: live (Azure VMs) or dummy (client-side simulation).' },
  { scope: 'Load Balancer', name: 'BACKEND_SERVERS', defaultVal: 'server-1=...,server-2=...,server-3=...', desc: 'Comma-separated worker ID and base URL pairs.' },
  { scope: 'Load Balancer', name: 'HEALTH_CHECK_INTERVAL', defaultVal: '2.5', desc: 'Seconds between background GET /health probes across workers.' },
  { scope: 'Load Balancer', name: 'REQUEST_TIMEOUT', defaultVal: '4.0', desc: 'Upstream HTTP timeout (seconds) before marking a worker timed out.' },
  { scope: 'Load Balancer', name: 'OVERLOAD_MAX_CONNS', defaultVal: '12', desc: 'Active socket threshold that trips the 20s circuit breaker cooldown.' },
];

const REPO_DOCS = [
  {
    file: 'docs/azure-cluster-guide.md',
    title: 'Azure Multi-VM Cluster & Developer Guide',
    desc: 'VNet IP layout, Live vs Simulation behavior, NSG firewall rules, and failover demo scenarios.',
    href: 'https://github.com/AbhishekS04/CloudComputingProject/blob/main/docs/azure-cluster-guide.md',
  },
  {
    file: 'docs/azure-backend-integration.md',
    title: 'Azure Backend Integration Guide',
    desc: 'NGINX/Flask reverse proxy setup, telemetry headers, CORS configuration, and worker service setup.',
    href: 'https://github.com/AbhishekS04/CloudComputingProject/blob/main/docs/azure-backend-integration.md',
  },
  {
    file: 'docs/demo-commands.md',
    title: 'Cluster Commands & Demo Playbook',
    desc: 'CLI stress testing, overload failover, and manual Azure VM shutdown verification steps.',
    href: 'https://github.com/AbhishekS04/CloudComputingProject/blob/main/docs/demo-commands.md',
  },
];

const TECH_STACK = [
  {
    group: 'Frontend & State',
    items: [
      ['React 18.3 + Vite 8.4', 'SPA build, dev proxy, and route code-splitting'],
      ['Tailwind CSS 3.4', 'Design tokens, dark mode, and responsive layout'],
      ['Zustand 5.0', 'Shared cluster, server fleet, and log store'],
      ['React Router 6.28', 'Client-side routing with Barba transitions'],
    ],
  },
  {
    group: 'Visualization & Charts',
    items: [
      ['Three.js + R3F / Drei', 'Isometric 3D topology scene in Studio'],
      ['Custom SVG Topology', '2D packet routing view in Studio'],
      ['Recharts + Custom Arc', 'Throughput, latency ridgeline, and heatmap plots'],
      ['Motion + Lenis', 'UI transitions and smooth scrolling'],
    ],
  },
  {
    group: 'Backend & Deployment',
    items: [
      ['Python Flask', 'L7 load balancer gateway and worker microservices'],
      ['Azure Central India', '4 Ubuntu VMs on internal subnet (10.0.1.0/24 / 172.16.0.4)'],
      ['Vercel Serverless Proxy', 'api/proxy.js (/lb-api, /vm-api) for HTTPS-to-HTTP calls'],
      ['GitHub Actions', 'Separate Frontend CI and Backend CI pipelines'],
    ],
  },
];

const CONTRIBUTORS = [
  {
    name: 'Abhishek',
    handle: '@AbhishekS04',
    commits: '16 commits',
    role: 'Frontend Architecture · Studio & Monitoring · Deployment',
    contributions: [
      'Built the Studio 3D/2D visualizer interface, traffic dispatcher, and Monitoring dashboard pages.',
      'Implemented the Vercel HTTPS-to-HTTP reverse proxy (/api/proxy.js) and Vite dev bridge for mixed-content free live telemetry.',
      'Configured frontend build optimization, CI workflow, and repository structure.',
    ],
    githubUrl: 'https://github.com/AbhishekS04',
    commitsUrl: 'https://github.com/AbhishekS04/CloudComputingProject/commits?author=AbhishekS04',
  },
  {
    name: 'Shyamsundar Barman',
    handle: 'Backend & Azure Cluster Lead',
    commits: '8 commits',
    role: 'Flask L7 Gateway · Worker Services · Azure Infrastructure',
    contributions: [
      'Engineered the Flask L7 load balancer (backend/load-balancer) with Round Robin, Least Connections, and IP Hash routing.',
      'Built the Ubuntu Flask backend worker service (backend/backend-server), background health checker, and unit tests.',
      'Provisioned the 4-VM Microsoft Azure Central India cluster and wired live backend endpoints.',
    ],
    githubUrl: 'https://github.com/AbhishekS04/CloudComputingProject/graphs/contributors',
    commitsUrl: 'https://github.com/AbhishekS04/CloudComputingProject/commits?author=Shyamsundar%20Barman',
  },
];

/* ─────────────────────────── Reusable UI Helpers ─────────────────────────── */

const METHOD_STYLES = {
  GET: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  POST: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
};

function CopyButton({ value, label = 'Copy', darkSurface = false }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const surfaceClass = darkSurface
    ? 'border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200'
    : 'border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-neutral-700 dark:text-neutral-300';

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`${label}: ${value}`}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border font-mono text-[11px] transition-colors cursor-pointer ${surfaceClass}`}
    >
      <span>{copied ? 'Copied' : label}</span>
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} className="opacity-65" />}
    </button>
  );
}

function CodeBlock({ title, code }) {
  return (
    <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#16171C] text-neutral-100 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.08] bg-white/[0.03]">
        <span className="font-mono text-[11px] text-neutral-400">{title}</span>
        <CopyButton value={code} label="Copy" darkSurface />
      </div>
      <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed font-mono text-neutral-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function DocSection({ id, index, title, subtitle, children }) {
  return (
    <section id={id} className="scroll-mt-24 pt-10 first:pt-0 border-t border-black/[0.07] dark:border-white/[0.08] first:border-t-0">
      <div className="mb-5">
        <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
          {index}
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function AboutPage() {
  const startCommands = `# 1. Start the Python Load Balancer Gateway (port 5000)
python backend/load-balancer/app.py

# 2. Start the Frontend Development Server (port 5173)
npm install
npm run dev

# 3. Build Frontend for Production
npm run build`;

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100vh-4rem)] w-full bg-[#FAF7F0] dark:bg-[#121212] text-neutral-800 dark:text-neutral-100 font-sans transition-colors duration-200">
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-24 sm:pb-28">
        {/* Two-column Layout: Left Sticky RailToc (desktop only) + Documentation Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-10 xl:gap-14 items-start">
          {/* Left Sticky Table of Contents (hidden on mobile/tablet) */}
          <aside className="hidden lg:block sticky top-24 self-start pl-1">
            <RailToc items={TOC_ITEMS} offset={96} title="On this page" />
          </aside>

          <main className="min-w-0 max-w-4xl space-y-10">
            {/* Document Header */}
            <header className="pb-8 border-b border-black/[0.08] dark:border-white/[0.08]">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 dark:text-neutral-400 mb-3">
                <BookOpen size={13} />
                <span>Project Documentation · BIFROST / LoadFlow v1.0</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 dark:text-white">
                Architecture, API &amp; Contributors
              </h1>
              <p className="mt-3 max-w-3xl text-sm sm:text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                Technical reference for BIFROST — a Layer-7 HTTP load balancer written in Python Flask,
                deployed across a 4-VM cluster on Microsoft Azure Central India, and paired with a React
                telemetry interface.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-semibold transition-colors"
                >
                  <Layers size={14} />
                  <span>Open Studio</span>
                  <ArrowRight size={13} />
                </Link>
                <Link
                  to="/monitoring"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-white/70 dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.07] text-xs font-medium text-neutral-700 dark:text-neutral-200 transition-colors"
                >
                  <ChartBar size={14} />
                  <span>Monitoring</span>
                </Link>
                <a
                  href="https://github.com/AbhishekS04/CloudComputingProject"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-white/70 dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.07] text-xs font-medium text-neutral-700 dark:text-neutral-200 transition-colors"
                >
                  <CodeSquare size={14} />
                  <span>GitHub Repository</span>
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </header>
            <div className="space-y-10">
              {/* 01. Overview */}
              <DocSection
              id="overview"
              index="01 · Overview"
              title="System Overview"
              subtitle="How BIFROST operates across real Azure infrastructure and local browser simulation."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.025] p-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                    <Server size={13} />
                    <span>Azure Live Mode</span>
                  </div>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                    Requests dispatched from the UI or CLI are sent to the Flask L7 gateway at{' '}
                    <code className="font-mono text-[11.5px] px-1 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08]">
                      20.244.34.101:5000
                    </code>
                    . On HTTPS deployments (Vercel), browser traffic is routed through same-origin{' '}
                    <code className="font-mono text-[11.5px] px-1 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08]">
                      /lb-api/*
                    </code>{' '}
                    and{' '}
                    <code className="font-mono text-[11.5px] px-1 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08]">
                      /vm-api/*
                    </code>{' '}
                    serverless rewrites to prevent browser mixed-content blocks.
                  </p>
                </div>

                <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.025] p-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-700 dark:text-blue-400 mb-2">
                    <TerminalSquare size={13} />
                    <span>Simulation Mode (Dummy Sim)</span>
                  </div>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                    Runs an in-memory JavaScript simulation engine in{' '}
                    <code className="font-mono text-[11.5px] px-1 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08]">
                      src/simulation/engine.js
                    </code>
                    . Supports all five balancing algorithms, configurable server weights, simulated
                    node crashes, and burst injection without opening external network sockets.
                  </p>
                </div>
              </div>
            </DocSection>

            {/* 02. Cluster Topology */}
            <DocSection
              id="topology"
              index="02 · Infrastructure"
              title="Azure Cluster Topology"
              subtitle="Four Linux virtual machines deployed in Microsoft Azure Central India (vnet-centralindia-2)."
            >
              <CodeBlock title="network-topology.txt" code={TOPOLOGY_ASCII} />

              <div id="azure-nodes" className="scroll-mt-24 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.025] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                    <thead>
                      <tr className="border-b border-black/[0.07] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] font-mono text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        <th className="py-2.5 px-4 font-medium">Node</th>
                        <th className="py-2.5 px-4 font-medium">Role</th>
                        <th className="py-2.5 px-4 font-medium">Private IP</th>
                        <th className="py-2.5 px-4 font-medium">HTTPS Proxy</th>
                        <th className="py-2.5 px-4 font-medium text-right">Public Endpoint</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {AZURE_NODES.map((node) => (
                        <tr key={node.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-medium text-neutral-900 dark:text-white whitespace-nowrap">
                            {node.name}
                          </td>
                          <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                            {node.role}
                          </td>
                          <td className="py-3 px-4 font-mono text-[12px] text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                            {node.privateIp}
                          </td>
                          <td className="py-3 px-4 font-mono text-[12px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                            {node.proxyPath}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <CopyButton value={node.publicEndpoint} label={node.publicEndpoint} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </DocSection>

            {/* 03. Routing Algorithms */}
            <DocSection
              id="algorithms"
              index="03 · Load Balancing"
              title="Routing Algorithms"
              subtitle="Implemented in backend/load-balancer/algorithms/ (Python) and src/simulation/loadBalancingAlgorithms.js (JS)."
            >
              <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.025] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                    <thead>
                      <tr className="border-b border-black/[0.07] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] font-mono text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        <th className="py-2.5 px-4 font-medium">Strategy</th>
                        <th className="py-2.5 px-4 font-medium">Complexity</th>
                        <th className="py-2.5 px-4 font-medium">Affinity</th>
                        <th className="py-2.5 px-4 font-medium">Availability</th>
                        <th className="py-2.5 px-4 font-medium">Behavior</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {ALGORITHMS.map((algo) => (
                        <tr key={algo.key}>
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <div className="font-medium text-neutral-900 dark:text-white">{algo.name}</div>
                            <code className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                              {algo.key}
                            </code>
                          </td>
                          <td className="py-3 px-4 align-top font-mono text-[12px] text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                            {algo.complexity}
                          </td>
                          <td className="py-3 px-4 align-top text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                            {algo.affinity}
                          </td>
                          <td className="py-3 px-4 align-top font-mono text-[11.5px] text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                            {algo.scope}
                          </td>
                          <td className="py-3 px-4 align-top text-neutral-600 dark:text-neutral-300 leading-relaxed min-w-[240px]">
                            {algo.behavior}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </DocSection>

            {/* 04. Health Checks & Failover */}
            <DocSection
              id="failover"
              index="04 · Reliability"
              title="Health Checks &amp; Failover"
              subtitle="Automatic worker eviction, circuit breaking, and frontend offline detection thresholds."
            >
              <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.025] p-5">
                <ul className="space-y-3 text-xs sm:text-[13.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  <li className="flex gap-3">
                    <span className="font-mono text-neutral-400 select-none">01</span>
                    <span>
                      <strong className="text-neutral-950 dark:text-white font-semibold">Active Worker Probes:</strong>{' '}
                      <code className="font-mono text-[12px]">HealthChecker</code> polls{' '}
                      <code className="font-mono text-[12px]">GET /health</code> on every enabled VM every{' '}
                      <code className="font-mono text-[12px]">2.5s</code> (with a{' '}
                      <code className="font-mono text-[12px]">2.0s</code> socket timeout). Unreachable VMs are evicted
                      from the candidate pool and a <code className="font-mono text-[12px]">server_update</code> SSE
                      event is broadcast.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-neutral-400 select-none">02</span>
                    <span>
                      <strong className="text-neutral-950 dark:text-white font-semibold">Overload Circuit Breaker:</strong>{' '}
                      When a selected worker reaches{' '}
                      <code className="font-mono text-[12px]">12</code> concurrent active connections (
                      <code className="font-mono text-[12px]">OVERLOAD_MAX_CONNS</code>) while other healthy nodes exist,
                      the gateway places it into a <code className="font-mono text-[12px]">20s</code> cooldown and
                      transparently retries the next healthy worker.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-neutral-400 select-none">03</span>
                    <span>
                      <strong className="text-neutral-950 dark:text-white font-semibold">Request Timeout &amp; Retry:</strong>{' '}
                      Upstream <code className="font-mono text-[12px]">POST /api/process</code> calls time out after{' '}
                      <code className="font-mono text-[12px]">4.0s</code>. On timeout or connection error, the gateway
                      marks the node crashed and fails over across remaining candidates before returning{' '}
                      <code className="font-mono text-[12px]">502</code> or <code className="font-mono text-[12px]">503</code>.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-neutral-400 select-none">04</span>
                    <span>
                      <strong className="text-neutral-950 dark:text-white font-semibold">Client Sync Debounce:</strong>{' '}
                      The browser polls <code className="font-mono text-[12px]">/api/servers</code> and{' '}
                      <code className="font-mono text-[12px]">/api/stats</code> every{' '}
                      <code className="font-mono text-[12px]">2.5s</code> with a <code className="font-mono text-[12px]">12s</code>{' '}
                      abort timeout, requiring 3 consecutive failures before flagging the gateway offline.
                    </span>
                  </li>
                </ul>
              </div>
            </DocSection>

            {/* 05. Gateway API */}
            <DocSection
              id="api"
              index="05 · Endpoints"
              title="Gateway REST &amp; SSE API"
              subtitle="Exposed by backend/load-balancer/app.py on port 5000 (and proxied at /lb-api/* on HTTPS)."
            >
              <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.025] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                    <thead>
                      <tr className="border-b border-black/[0.07] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] font-mono text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        <th className="py-2.5 px-4 font-medium w-20">Method</th>
                        <th className="py-2.5 px-4 font-medium">Path</th>
                        <th className="py-2.5 px-4 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {API_ENDPOINTS.map((ep) => (
                        <tr key={`${ep.method}-${ep.path}`}>
                          <td className="py-2.5 px-4 align-top whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border font-mono text-[10.5px] font-semibold ${
                                METHOD_STYLES[ep.method] || ''
                              }`}
                            >
                              {ep.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 align-top font-mono text-[12px] text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                            {ep.path}
                          </td>
                          <td className="py-2.5 px-4 align-top text-neutral-600 dark:text-neutral-300 leading-relaxed min-w-[260px]">
                            {ep.desc}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </DocSection>

            {/* 06. Local Setup & Docs */}
            <DocSection
              id="setup"
              index="06 · Setup &amp; Docs"
              title="Local Setup &amp; Documentation"
              subtitle="Commands, environment variables, and repository markdown guides."
            >
              <CodeBlock title="quickstart.sh" code={startCommands} />

              <div id="env-vars" className="scroll-mt-24 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.025] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-black/[0.07] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] font-mono text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Environment Variables
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {ENV_VARS.map((v) => (
                        <tr key={v.name}>
                          <td className="py-2.5 px-4 align-top whitespace-nowrap text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                            {v.scope}
                          </td>
                          <td className="py-2.5 px-4 align-top whitespace-nowrap font-mono text-[12px] font-medium text-neutral-900 dark:text-white">
                            {v.name}
                          </td>
                          <td className="py-2.5 px-4 align-top whitespace-nowrap font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400">
                            {v.defaultVal}
                          </td>
                          <td className="py-2.5 px-4 align-top text-neutral-600 dark:text-neutral-300 min-w-[220px]">
                            {v.desc}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div id="repo-docs" className="scroll-mt-24 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {REPO_DOCS.map((doc) => (
                  <a
                    key={doc.file}
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.025] hover:border-black/20 dark:hover:border-white/20 p-4 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                          {doc.file}
                        </span>
                        <ArrowUpRight
                          size={13}
                          className="shrink-0 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors"
                        />
                      </div>
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {doc.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                        {doc.desc}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </DocSection>

            {/* 07. Tech Stack */}
            <DocSection
              id="stack"
              index="07 · Stack"
              title="Technology Stack"
              subtitle="Libraries, runtime services, and CI/CD tooling verified in the repository."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TECH_STACK.map((group) => (
                  <div
                    key={group.group}
                    className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.025] p-4"
                  >
                    <h3 className="font-mono text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
                      {group.group}
                    </h3>
                    <dl className="space-y-3">
                      {group.items.map(([name, desc]) => (
                        <div key={name}>
                          <dt className="text-xs sm:text-[13px] font-semibold text-neutral-900 dark:text-white">
                            {name}
                          </dt>
                          <dd className="text-[11.5px] text-neutral-600 dark:text-neutral-400 leading-snug mt-0.5">
                            {desc}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </DocSection>

            {/* 08. Contributors */}
            <DocSection
              id="contributors"
              index="08 · Team"
              title="Contributors"
              subtitle="Maintainers and commit authors of CloudComputingProject."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CONTRIBUTORS.map((person) => (
                  <div
                    key={person.name}
                    className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.025] p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-neutral-950 dark:text-white">
                            {person.name}
                          </h3>
                          <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                            {person.handle}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] font-mono text-[11px] text-neutral-600 dark:text-neutral-300 shrink-0">
                          {person.commits}
                        </span>
                      </div>

                      <p className="mt-2.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                        {person.role}
                      </p>

                      <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {person.contributions.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="text-neutral-400 select-none">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center gap-4 text-xs font-mono">
                      <a
                        href={person.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors"
                      >
                        <span>GitHub Profile</span>
                        <ArrowUpRight size={11} />
                      </a>
                      <a
                        href={person.commitsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors"
                      >
                        <span>Commit History</span>
                        <ArrowUpRight size={11} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.02] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                <div className="inline-flex items-center gap-2">
                  <Users size={14} className="shrink-0" />
                  <span>Full commit graph and contributor breakdown are maintained on GitHub.</span>
                </div>
                <a
                  href="https://github.com/AbhishekS04/CloudComputingProject/graphs/contributors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-neutral-800 dark:text-neutral-200 hover:underline"
                >
                  <span>View contributors graph</span>
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </DocSection>
            </div>
          </main>
        </div>
      </div>

      <ProgressiveBlur className="fixed bottom-0 z-30" height="64px" position="bottom" />
    </div>
  );
}
