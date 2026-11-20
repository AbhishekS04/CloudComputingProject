import React, { useState, useEffect, useMemo } from 'react';
import SystemDesignNavbar from '../components/layout/SystemDesignNavbar';
import MultiSeriesLineChart from '../components/monitoring/MultiSeriesLineChart';
import DonutChart from '../components/monitoring/DonutChart';
import ContributionHeatmapCard from '../components/monitoring/ContributionHeatmapCard';
import SlopeChart from '../components/monitoring/SlopeChart';
import Ridgeline from '../components/monitoring/Ridgeline';
import StatusBars from '../components/monitoring/StatusBars';
import RadialChart from '../components/monitoring/RadialChart';
import NodeFleetTable from '../components/monitoring/NodeFleetTable';
import EdgeGatewayTelemetryCard from '../components/monitoring/EdgeGatewayTelemetryCard';
import { TrafficCard } from '@/components/ui/traffic-card';
import { TRAFFIC_CHANNELS, TRAFFIC_RANGES } from '../data/trafficCardData';
import { StatCard, StatGrid } from '@/components/ui/stat-card';
import { useSimulationStore } from '../store/simulationStore';
import {
  Activity,
  Server,
  Cloud,
  Zap,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Cpu,
  Layers,
  Radio,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Globe
} from 'lucide-react';

export default function MonitoringDashboardPage() {
  const [timeframe, setTimeframe] = useState('24h');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [liveClock, setLiveClock] = useState(new Date().toLocaleTimeString());

  // Simulation store telemetry hooks
  const servers = useSimulationStore((state) => state.servers);
  const metrics = useSimulationStore((state) => state.metrics);
  const trafficHistory = useSimulationStore((state) => state.trafficHistory);
  const events = useSimulationStore((state) => state.events);
  const targetRps = useSimulationStore((state) => state.targetRps);
  const toggleServer = useSimulationStore((state) => state.toggleServer);
  const triggerTrafficSpike = useSimulationStore((state) => state.triggerTrafficSpike);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live active server counts
  const totalServers = servers.length;
  const activeServers = servers.filter((s) => s.status === 'healthy' || s.healthy).length;

  // Donut chart dataset: Traffic by Protocol & Service
  const protocolData = useMemo(() => [
    { key: 'http2', label: 'HTTP/2 APIs', value: Math.round(targetRps * 45) + 320, color: '#3B82F6' },
    { key: 'ws', label: 'WebSocket Streams', value: Math.round(targetRps * 25) + 180, color: '#10B981' },
    { key: 'grpc', label: 'gRPC Microservices', value: Math.round(targetRps * 18) + 120, color: '#8B5CF6' },
    { key: 'rest', label: 'REST v1/v2', value: Math.round(targetRps * 10) + 90, color: '#F59E0B' },
    { key: 'static', label: 'Edge Static Assets', value: Math.round(targetRps * 8) + 50, color: '#EC4899' },
    { key: 'probes', label: 'Health Probes', value: 24, color: '#64748B' },
  ], [targetRps]);

  // Transform rolling traffic history for the Line Chart
  const lineChartData = useMemo(() => {
    if (!trafficHistory || trafficHistory.length === 0) return [];
    return trafficHistory.map((item, idx) => ({
      time: item.time || `${12 + Math.floor(idx / 2)}:${String((idx * 3) % 60).padStart(2, '0')}`,
      rps: (item.rps || targetRps) * 45 + (idx % 3) * 15,
      latency: item.latency || 22 + (idx % 2) * 2,
    }));
  }, [trafficHistory, targetRps]);

  // Ridgeline series data based on current servers
  const ridgelineSeries = useMemo(() => {
    const baseColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];
    return servers.map((s, i) => {
      const isOnline = s.status === 'healthy' || s.healthy;
      return {
        id: s.id,
        label: `${s.name} (${s.ip || `10.0.1.1${i}`})`,
        mean: isOnline ? s.latency || 20 + i * 3 : 90,
        std: isOnline ? 3.5 + i * 0.8 : 12,
        color: isOnline ? baseColors[i % baseColors.length] : '#EF4444',
      };
    });
  }, [servers]);

  // Slope chart data comparing Baseline Skew vs Balanced
  const slopeData = useMemo(() => {
    return servers.map((s, i) => ({
      key: s.id,
      label: s.name,
      start: 85 + i * 8, // Unbalanced skew baseline
      end: (s.status === 'healthy' || s.healthy) ? (s.latency || 21 + i * 2) : 95,
      color: (s.status === 'healthy' || s.healthy) ? '#10B981' : '#EF4444',
    }));
  }, [servers]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (eventFilter === 'WARNING') {
      return events.filter((e) => e.type === 'warning' || e.type === 'error');
    }
    if (eventFilter === 'SUCCESS') {
      return events.filter((e) => e.type === 'success');
    }
    return events;
  }, [events, eventFilter]);

  return (
    <div className="flex flex-col min-h-screen w-screen overflow-x-hidden bg-[#FAF7F0] dark:bg-[#121212] text-neutral-800 dark:text-neutral-100 font-sans transition-colors duration-200">
      {/* 1. Global Navigation Bar */}
      <SystemDesignNavbar />

      {/* 2. Monitoring Workspace Header Banner */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.02] backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                Cluster Telemetry
              </h1>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Real-time ingress throughput, routing efficiency, and edge performance · Synced {liveClock}
            </p>
          </div>

          {/* Header Action Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={triggerTrafficSpike}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Simulate Surge</span>
            </button>

            <div className="h-8 px-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Live Probe: 1.0s</span>
            </div>

            <div className="h-8 px-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-semibold text-neutral-900 dark:text-white">{activeServers}/{totalServers}</span>
              <span className="text-neutral-500 dark:text-neutral-400">Nodes Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Body */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ================================================================ */}
        {/* SECTION A: EASYUI STAT CARDS (Count-up, Directional Pill, Sparkline) */}
        {/* ================================================================ */}
        <StatGrid>
          <StatCard
            label="TOTAL INGRESS RATE"
            value={targetRps * 45}
            previous={Math.round(targetRps * 45 * 0.86)}
            trend={trafficHistory.map((h) => (h.rps || targetRps) * 45)}
            trendLabels={trafficHistory.map((h) => h.time)}
            format={(n) => `${Math.round(n).toLocaleString()} req/s`}
            period={`Peak: ${(targetRps * 68).toLocaleString()} req/s · 99.99% Delivered`}
            color="#3B82F6"
            goodWhen="up"
          />

          <StatCard
            label="P95 CLUSTER LATENCY"
            value={Number((metrics?.avgLatency || 21.8).toFixed(1))}
            previous={25.2}
            trend={trafficHistory.map((h) => h.latency || 22)}
            trendLabels={trafficHistory.map((h) => h.time)}
            format={(n) => `${n.toFixed(1)} ms`}
            period="SLA Target: <50ms · Healthy Margin"
            color="#10B981"
            goodWhen="down"
          />

          <StatCard
            label="ACTIVE TCP SOCKETS"
            value={servers.reduce((acc, s) => acc + (s.connections || 16), 0)}
            previous={42}
            trend={[34, 38, 41, 45, 42, 48, 52]}
            trendLabels={["14:00", "14:15", "14:30", "14:45", "15:00", "15:15", "15:30"]}
            format={(n) => `${Math.round(n)} connections`}
            period={`Fleet: ${activeServers}/${totalServers} Nodes Active · Balanced`}
            color="#8B5CF6"
            goodWhen="up"
          />

          <StatCard
            label="90-DAY SLA AVAILABILITY"
            value={99.98}
            previous={99.95}
            trend={[99.91, 99.93, 99.94, 99.96, 99.97, 99.98]}
            trendLabels={["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"]}
            format={(n) => `${n.toFixed(2)}%`}
            period="Automatic Failovers: 2 · MTTR: 1.2s"
            color="#06B6D4"
            goodWhen="up"
          />
        </StatGrid>

        {/* ================================================================ */}
        {/* SECTION B: INGRESS TRAFFIC & EDGE GATEWAY HERO DUO              */}
        {/* ================================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* EasyUI TrafficCard Stacked Capsules (5 cols / ~42%) */}
          <div className="lg:col-span-5 flex flex-col">
            <TrafficCard
              title="INGRESS TRAFFIC"
              unit="reqs"
              ranges={TRAFFIC_RANGES}
              channels={TRAFFIC_CHANNELS}
              className="flex-1"
            />
          </div>

          {/* Edge Ingress Gateway Telemetry (7 cols / ~58%) */}
          <div className="lg:col-span-7 flex flex-col">
            <EdgeGatewayTelemetryCard className="flex-1" />
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION C: PRIMARY TELEMETRY (Line Chart & Donut Chart)          */}
        {/* ================================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* MultiSeriesLineChart (8 Cols / ~67% width) */}
          <div className="lg:col-span-8 flex flex-col">
            <MultiSeriesLineChart
              title="REAL-TIME INGRESS THROUGHPUT & RESPONSE LATENCY"
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              height={240}
              className="flex-1"
            />
          </div>

          {/* DonutChart (4 Cols / ~33% width) */}
          <div className="lg:col-span-4 p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#1A1A1A]/90 border border-neutral-200/80 dark:border-white/10 shadow-xs backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Traffic Share by Protocol
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400">
                L7 Breakdown
              </span>
            </div>
            <DonutChart
              data={protocolData}
              label="Protocol Distribution"
              unit="req/s"
              totalLabel="Total Ingress"
              size={210}
              thickness={26}
            />
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION D: ANALYTIC ACTIVITY HEATMAP & 24-HOUR POLAR CLOCK       */}
        {/* ================================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Contribution Heatmap Chart (8 Cols / ~67% width) */}
          <div className="lg:col-span-8 flex flex-col">
            <ContributionHeatmapCard className="flex-1" />
          </div>

          {/* 24-Hour Diurnal Radial Clock (4 Cols / ~33% width) */}
          <div className="lg:col-span-4 flex flex-col">
            <RadialChart className="flex-1" />
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION E: LATENCY RIDGELINE & 90-DAY STATUS STRIPS              */}
        {/* ================================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Ridgeline (Joy Plot) (6 Cols / 50% width) */}
          <div className="lg:col-span-6 flex flex-col">
            <Ridgeline className="flex-1" />
          </div>

          {/* StatusBars Fleet Strips (6 Cols / 50% width) */}
          <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#1A1A1A]/90 border border-neutral-200/80 dark:border-white/10 shadow-xs backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Azure Node Uptime History (90-Day Strips)
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                All Systems Normal
              </span>
            </div>

            <StatusBars
              label="Server A · vm-eastus-prod-01"
              sublabel="Azure East US · 10.0.1.10"
              uptime={99.99}
              maxDays={60}
              incidents={[
                { date: '2026-10-14', degraded: 4, incidents: [{ title: 'TCP connection drain spike', minutes: 4 }] }
              ]}
            />

            <StatusBars
              label="Server B · vm-eastus-prod-02"
              sublabel="Azure East US · 10.0.1.11"
              uptime={99.96}
              maxDays={60}
              incidents={[
                { date: '2026-11-02', downtime: 12, incidents: [{ title: 'Kernel security patch restart', minutes: 12 }] }
              ]}
            />

            <StatusBars
              label="Server C · vm-eastus-prod-03"
              sublabel="Azure East US · 10.0.1.12"
              uptime={99.98}
              maxDays={60}
              incidents={[
                { date: '2026-10-28', degraded: 6, incidents: [{ title: 'Minor memory pressure reroute', minutes: 6 }] }
              ]}
            />

            <StatusBars
              label="Cloud Load Balancer Core"
              sublabel="Managed L7 Envoy Proxy Layer"
              uptime={100.0}
              maxDays={60}
              incidents={[]}
            />
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION F: AZURE FLEET DATA TABLE & SLOPE EQUALIZATION CHART    */}
        {/* ================================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Azure VM Fleet Table (8 Cols / ~67% width) */}
          <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#1A1A1A]/90 border border-neutral-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
            <NodeFleetTable
              servers={servers}
              onToggleServer={toggleServer}
            />
          </div>

          {/* Slope Chart (4 Cols / ~33% width) */}
          <div className="lg:col-span-4 flex flex-col">
            <SlopeChart className="flex-1" />
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION G: REAL-TIME DIAGNOSTIC AUDIT & EVENT TICKER             */}
        {/* ================================================================ */}
        <section className="p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#1A1A1A]/90 border border-neutral-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-500" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Real-Time Health Checks & Orchestration Event Stream
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-white/10 text-[11px] font-mono">
                {['ALL', 'WARNING', 'SUCCESS'].map((typeKey) => (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setEventFilter(typeKey)}
                    className={`px-2.5 py-0.5 rounded-[5px] transition-all cursor-pointer font-medium ${
                      eventFilter === typeKey
                        ? 'bg-white dark:bg-[#2A2A2A] text-neutral-900 dark:text-white shadow-2xs font-bold'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {typeKey}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                ({filteredEvents.length} events)
              </span>
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 font-mono text-xs pr-1">
            {filteredEvents.slice(0, 10).map((evt) => {
              const isWarning = evt.type === 'warning' || evt.type === 'error';
              const isSuccess = evt.type === 'success';

              return (
                <div
                  key={evt.id}
                  className="flex items-start justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 transition-colors hover:bg-neutral-100/70 dark:hover:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        isWarning ? 'bg-amber-500 animate-pulse' : isSuccess ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-neutral-900 dark:text-white truncate">
                        {evt.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                        {evt.description}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400 shrink-0 ml-3">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
