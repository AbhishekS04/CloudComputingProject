import React, { useState, useEffect, useMemo, useCallback, lazy, memo } from 'react';
import { Skeleton } from 'skullet/react';
import SystemDesignNavbar from '../components/layout/SystemDesignNavbar';
import LazyTelemetrySection from '../components/monitoring/LazyTelemetrySection';
import { ChartCardSkeleton, KpiCardSkeleton } from '../components/monitoring/MonitoringSkeletons';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { TRAFFIC_CHANNELS, TRAFFIC_RANGES } from '../data/trafficCardData';
import { StatCard, StatGrid } from '@/components/ui/stat-card';
import { TrafficCard } from '@/components/ui/traffic-card';
import EdgeGatewayTelemetryCard from '../components/monitoring/EdgeGatewayTelemetryCard';
import { useSimulationStore } from '../store/simulationStore';
import {
  Server,
  Flash,
  FileText,
  CheckCircle,
  AlertTriangle,
  Radio,
  Refresh,
} from 'reicon-react';
import { DuotoneIcon } from '../components/ui/DuotoneIcon';

// Code-split heavy below-the-fold visualization modules
const MultiSeriesLineChart = lazy(() => import('../components/monitoring/MultiSeriesLineChart'));
const DonutChart = lazy(() => import('../components/monitoring/DonutChart'));
const ContributionHeatmapCard = lazy(() => import('../components/monitoring/ContributionHeatmapCard'));
const RadialChart = lazy(() => import('../components/monitoring/RadialChart'));
const Ridgeline = lazy(() => import('../components/monitoring/Ridgeline'));
const StatusBars = lazy(() => import('../components/monitoring/StatusBars'));
const NodeFleetTable = lazy(() => import('../components/monitoring/NodeFleetTable'));
const SlopeChart = lazy(() => import('../components/monitoring/SlopeChart'));

const SKELETON_FLEX_CLASS =
  'flex-1 flex flex-col [&>[skullet-pane]]:flex-1 [&>[skullet-pane]]:flex [&>[skullet-pane]]:flex-col [&_[skullet-loading]]:flex-1 [&_[skullet-loading]]:flex [&_[skullet-loading]]:flex-col';

const STATUS_NODES_DATA = [
  {
    key: 'node-1',
    label: 'Backend Node 1 · vm-backend-01',
    sublabel: 'Pub: 52.172.229.225:5001 · Priv: 10.0.1.10',
    uptime: 99.99,
    incidents: [{ date: '2026-10-14', degraded: 4, incidents: [{ title: 'TCP connection drain spike', minutes: 4 }] }],
  },
  {
    key: 'node-2',
    label: 'Backend Node 2 · vm-backend-02',
    sublabel: 'Pub: 20.193.245.71:5001 · Priv: 10.0.1.11',
    uptime: 99.96,
    incidents: [{ date: '2026-11-02', downtime: 12, incidents: [{ title: 'Kernel security patch restart', minutes: 12 }] }],
  },
  {
    key: 'node-3',
    label: 'Backend Node 3 · vm-backend-03',
    sublabel: 'Pub: 52.172.255.132:5001 · Priv: 10.0.1.12',
    uptime: 99.98,
    incidents: [{ date: '2026-10-28', degraded: 6, incidents: [{ title: 'Minor memory pressure reroute', minutes: 6 }] }],
  },
  {
    key: 'node-gw',
    label: 'Azure VM 1 · Load Balancer Gateway',
    sublabel: 'Pub: 127.0.0.1:5000 · Priv: 10.0.1.4 (VNet: 10.0.1.0/24)',
    uptime: 100.0,
    incidents: [],
  },
];

// Isolated 1-second clock so the rest of the dashboard never re-renders on clock ticks
const LiveClockLabel = memo(function LiveClockLabel() {
  const [liveClock, setLiveClock] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span>Synced {liveClock}</span>;
});

const HeaderFleetBadge = memo(function HeaderFleetBadge() {
  const servers = useSimulationStore((state) => state.servers);
  const totalServers = servers.length;
  const activeServers = servers.filter((s) => s.status === 'healthy' || s.healthy).length;

  return (
    <div className="h-8 px-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
      <DuotoneIcon icon={Server} size={14} className="text-blue-500" secondaryOpacity={0.25} />
      <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
        {activeServers}/{totalServers}
      </span>
      <span className="text-neutral-500 dark:text-neutral-400">VMs Active</span>
    </div>
  );
});

const SectionKpiGrid = memo(function SectionKpiGrid({ routeSettled, syncKey }) {
  const servers = useSimulationStore((state) => state.servers);
  const metrics = useSimulationStore((state) => state.metrics);
  const trafficHistory = useSimulationStore((state) => state.trafficHistory);
  const targetRps = useSimulationStore((state) => state.targetRps);

  // Stagger the 4 KPI cards sequentially (2 at a time -> smooth sweep)
  const [kpiStep, setKpiStep] = useState(0);

  useEffect(() => {
    setKpiStep(0);
    if (!routeSettled) return;
    const t1 = setTimeout(() => setKpiStep(1), 160);
    const t2 = setTimeout(() => setKpiStep(2), 320);
    const t3 = setTimeout(() => setKpiStep(3), 460);
    const t4 = setTimeout(() => setKpiStep(4), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [routeSettled, syncKey]);

  const totalServers = servers.length;
  const activeServers = servers.filter((s) => s.status === 'healthy' || s.healthy).length;

  const statCardsData = useMemo(
    () => [
      {
        key: 'ingress',
        label: 'TOTAL INGRESS RATE',
        value: targetRps * 45,
        previous: Math.round(targetRps * 45 * 0.86),
        trend: trafficHistory.map((h) => (h.rps || targetRps) * 45),
        trendLabels: trafficHistory.map((h) => h.time),
        format: (n) => `${Math.round(n).toLocaleString()} req/s`,
        period: `Peak: ${(targetRps * 68).toLocaleString()} req/s · Total: ${(metrics?.totalRequests || 0).toLocaleString()} reqs`,
        color: '#3B82F6',
        goodWhen: 'up',
      },
      {
        key: 'latency',
        label: 'P95 CLUSTER LATENCY',
        value: Number((metrics?.avgLatency || 21.8).toFixed(1)),
        previous: 25.2,
        trend: trafficHistory.map((h) => h.latency || 22),
        trendLabels: trafficHistory.map((h) => h.time),
        format: (n) => `${n.toFixed(1)} ms`,
        period: 'SLA Target: <50ms · Healthy Margin',
        color: '#10B981',
        goodWhen: 'down',
      },
      {
        key: 'sockets',
        label: 'ACTIVE TCP SOCKETS',
        value: servers.reduce((acc, s) => acc + (s.activeConnections ?? s.connections ?? 0), 0),
        previous: 42,
        trend: [34, 38, 41, 45, 42, 48, 52],
        trendLabels: ['14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30'],
        format: (n) => `${Math.round(n)} connections`,
        period: `Fleet: ${activeServers}/${totalServers} Nodes Active · Balanced`,
        color: '#8B5CF6',
        goodWhen: 'up',
      },
      {
        key: 'sla',
        label: '90-DAY SLA AVAILABILITY',
        value: 99.98,
        previous: 99.95,
        trend: [99.91, 99.93, 99.94, 99.96, 99.97, 99.98],
        trendLabels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
        format: (n) => `${n.toFixed(2)}%`,
        period: 'Automatic Failovers: 2 · MTTR: 1.2s',
        color: '#06B6D4',
        goodWhen: 'up',
      },
    ],
    [targetRps, trafficHistory, metrics, servers, activeServers, totalServers]
  );

  return (
    <StatGrid className="gap-4 sm:gap-5">
      {statCardsData.map((card, idx) => (
        <Skeleton
          key={card.key}
          id={`monitoring-kpi-${card.key}`}
          data={kpiStep > idx ? card : null}
          skeleton={<KpiCardSkeleton />}
          label={`Loading ${card.label}`}
        >
          {(item) => (
            <StatCard
              label={item.label}
              value={item.value}
              previous={item.previous}
              trend={item.trend}
              trendLabels={item.trendLabels}
              format={item.format}
              period={item.period}
              color={item.color}
              goodWhen={item.goodWhen}
            />
          )}
        </Skeleton>
      ))}
    </StatGrid>
  );
});

const BackendDonutPanel = memo(function BackendDonutPanel({ ready, isTimeframeLoading }) {
  const servers = useSimulationStore((state) => state.servers);
  const targetRps = useSimulationStore((state) => state.targetRps);

  const backendVmTrafficData = useMemo(() => {
    const activeList = servers.filter((s) => s.status === 'healthy' || s.healthy);
    const totalActive = activeList.length;
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];
    const totalServerRequests = servers.reduce((acc, s) => acc + (s.totalRequests || 0), 0);

    const vmSlices = servers.map((s, idx) => {
      const isHealthy = s.status === 'healthy' || s.healthy;
      const baseShare = isHealthy
        ? totalServerRequests > 0
          ? Math.max(1, s.totalRequests || 0)
          : Math.round(((targetRps * 45) / Math.max(1, totalActive)) * (s.weight || 1))
        : 0;

      return {
        key: s.id,
        label: `${s.name} (${s.ip || (s.url ? s.url.replace(/^https?:\/\//, '') : '52.172.229.225:5001')}) ${isHealthy ? '' : '[FAILOVER CRASH]'}`,
        value: baseShare,
        color: isHealthy ? colors[idx % colors.length] : '#EF4444',
      };
    });

    return [
      ...vmSlices,
      {
        key: 'lb-probes',
        label: 'Azure LB Health Probes',
        value: totalServerRequests > 0 ? Math.max(2, Math.round(totalServerRequests * 0.05)) : 24,
        color: '#64748B',
      },
    ];
  }, [servers, targetRps]);

  return (
    <Skeleton
      id="monitoring-backend-donut"
      data={ready ? backendVmTrafficData : null}
      skeleton={<ChartCardSkeleton variant="donut" minHeight={360} />}
      loading={isTimeframeLoading}
      label="Loading backend VM load distribution"
      className={SKELETON_FLEX_CLASS}
    >
      {(donutData) => (
        <div className="flex-1 p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col justify-between font-sans">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Backend Load Distribution
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/10 text-neutral-600 dark:text-neutral-300 font-medium">
              3 Compute VMs
            </span>
          </div>
          <DonutChart
            data={donutData}
            label="Backend VM Load"
            unit="req/s"
            totalLabel="Total Routed"
            size={210}
            thickness={26}
          />
        </div>
      )}
    </Skeleton>
  );
});

const StatusBarsPanel = memo(function StatusBarsPanel({ ready }) {
  const servers = useSimulationStore((state) => state.servers);
  const totalServers = servers.length;
  const activeServers = servers.filter((s) => s.status === 'healthy' || s.healthy).length;

  return (
    <Skeleton
      id="monitoring-status-bars"
      data={ready ? STATUS_NODES_DATA : null}
      skeleton={<ChartCardSkeleton variant="bars" minHeight={390} />}
      label="Loading 60-day Azure node uptime history"
      className={SKELETON_FLEX_CLASS}
    >
      {(nodes) => (
        <div className="flex-1 p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-3 font-sans">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Azure Node Uptime History (60-Day Strips)
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {activeServers === totalServers ? 'All Nodes Healthy' : `${totalServers - activeServers} Node Degraded/Offline`}
            </span>
          </div>

          {nodes.map((node) => (
            <StatusBars
              key={node.key}
              label={node.label}
              sublabel={node.sublabel}
              uptime={node.uptime}
              maxDays={60}
              incidents={node.incidents}
            />
          ))}
        </div>
      )}
    </Skeleton>
  );
});

const FleetTablePanel = memo(function FleetTablePanel({ ready }) {
  const servers = useSimulationStore((state) => state.servers);
  const toggleServer = useSimulationStore((state) => state.toggleServer);

  return (
    <Skeleton
      id="monitoring-fleet-table"
      data={ready ? servers : null}
      skeleton={<ChartCardSkeleton variant="table" minHeight={360} />}
      label="Loading Azure VM fleet inventory"
      className={SKELETON_FLEX_CLASS}
    >
      {(fleetServers) => (
        <div className="flex-1 p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] shadow-xs font-sans">
          <NodeFleetTable servers={fleetServers} onToggleServer={toggleServer} />
        </div>
      )}
    </Skeleton>
  );
});

const AuditTrailPanel = memo(function AuditTrailPanel({ ready }) {
  const [eventFilter, setEventFilter] = useState('ALL');
  const events = useSimulationStore((state) => state.events);

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
    <Skeleton
      id="monitoring-audit-trail"
      data={ready ? filteredEvents : null}
      skeleton={<ChartCardSkeleton variant="list" minHeight={240} />}
      label="Loading cluster health checks and orchestration audit trail"
    >
      {(auditEvents) => (
        <section className="p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] shadow-xs font-sans">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <DuotoneIcon icon={FileText} size={16} className="text-neutral-600 dark:text-neutral-300" secondaryOpacity={0.2} />
              <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                Cluster Health Checks & Orchestration Audit Trail
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-white/10 text-[11px] font-mono">
                {['ALL', 'WARNING', 'SUCCESS'].map((typeKey) => (
                  <button
                    key={typeKey}
                    type="button"
                    data-cuelume-select
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
                ({auditEvents.length} events)
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="max-h-56 overflow-y-auto space-y-2 font-mono text-xs pr-1 pb-8">
              {auditEvents.slice(0, 10).map((evt) => {
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
            <ProgressiveBlur height="48px" position="bottom" />
          </div>
        </section>
      )}
    </Skeleton>
  );
});

export default function MonitoringDashboardPage() {
  const [timeframe, setTimeframe] = useState('24h');
  const [isTimeframeLoading, setIsTimeframeLoading] = useState(false);
  const [syncKey, setSyncKey] = useState(0);
  const [isSyncing, setIsSyncing] = useState(true);
  const [routeSettled, setRouteSettled] = useState(() =>
    typeof window !== 'undefined' ? !window.__routeTransitionActive : true
  );

  const triggerTrafficSpike = useSimulationStore((state) => state.triggerTrafficSpike);
  const crashRandomServer = useSimulationStore((state) => state.crashRandomServer);
  const recoverAllServers = useSimulationStore((state) => state.recoverAllServers);

  // Wait for Venetian blinds exit transition to finish before hydrating sections
  useEffect(() => {
    if (typeof window === 'undefined' || routeSettled) return;

    const handleTransitionState = (e) => {
      if (e.detail?.state === 'idle') {
        setRouteSettled(true);
      }
    };

    window.addEventListener('route-transition-state', handleTransitionState);
    const fallbackTimer = setTimeout(() => setRouteSettled(true), 1000);

    return () => {
      window.removeEventListener('route-transition-state', handleTransitionState);
      clearTimeout(fallbackTimer);
    };
  }, [routeSettled]);

  useEffect(() => {
    if (!routeSettled) return;
    setIsSyncing(true);
    const timer = setTimeout(() => setIsSyncing(false), 1150);
    return () => clearTimeout(timer);
  }, [routeSettled, syncKey]);

  const triggerTelemetrySync = useCallback(() => {
    setSyncKey((prev) => prev + 1);
  }, []);

  const handleTimeframeChange = useCallback((nextTimeframe) => {
    setTimeframe(nextTimeframe);
    setIsTimeframeLoading(true);
  }, []);

  useEffect(() => {
    if (!isTimeframeLoading) return;
    const timer = setTimeout(() => setIsTimeframeLoading(false), 380);
    return () => clearTimeout(timer);
  }, [isTimeframeLoading]);

  const ingressPayload = useMemo(
    () => ({ ranges: TRAFFIC_RANGES, channels: TRAFFIC_CHANNELS }),
    []
  );
  const edgeGatewayPayload = useMemo(() => ({ vip: '203.0.113.7:443' }), []);

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-clip bg-[#FAF7F0] dark:bg-[#121212] text-neutral-800 dark:text-neutral-100 font-sans transition-colors duration-200">
      {/* 1. Global Navigation Bar */}
      <SystemDesignNavbar />

      {/* 2. Monitoring Workspace Header Banner */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.08] bg-white/75 dark:bg-[#16171a]/85 py-3.5">
        <div className="w-full max-w-[1380px] mx-auto px-3 sm:px-6 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                Azure VM Fleet · Cluster Telemetry
              </h1>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              4 Azure VMs (1x L7 Load Balancer + 3x Backend Nodes) · VNet:{' '}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">10.0.1.0/24</span> ·{' '}
              <LiveClockLabel />
            </p>
          </div>

          {/* Header Action Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-cuelume-tap
              onClick={triggerTrafficSpike}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Inject sudden traffic surge into the cluster"
            >
              <DuotoneIcon icon={Flash} size={14} className="text-amber-400" secondaryOpacity={0.45} />
              <span>Simulate Surge</span>
            </button>

            <button
              type="button"
              data-cuelume-tap
              data-cuelume-emphasis="strong"
              onClick={crashRandomServer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Simulate crash on a healthy Azure VM to test failover"
            >
              <DuotoneIcon icon={AlertTriangle} size={14} secondaryOpacity={0.3} />
              <span>Simulate VM Crash</span>
            </button>

            <button
              type="button"
              data-cuelume-tap
              onClick={recoverAllServers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Restore all crashed Azure backend nodes"
            >
              <DuotoneIcon icon={CheckCircle} size={14} secondaryOpacity={0.3} />
              <span>Restore Fleet</span>
            </button>

            <button
              type="button"
              data-cuelume-tap
              data-cuelume-emphasis="subtle"
              onClick={triggerTelemetrySync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-black/[0.05] hover:bg-black/[0.09] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-neutral-800 dark:text-neutral-100 border border-black/[0.06] dark:border-white/[0.08] transition-all active:scale-95 cursor-pointer disabled:opacity-60 whitespace-nowrap"
              title="Re-sync Azure cluster telemetry and preview progressive sweep skeletons"
            >
              <Refresh size={14} className={isSyncing ? 'animate-spin text-blue-500' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Telemetry'}</span>
            </button>

            <div className="h-8 px-2.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 whitespace-nowrap">
              <DuotoneIcon icon={Radio} size={14} className="text-emerald-500 animate-pulse" secondaryOpacity={0.25} />
              <span>Probe: 1.0s</span>
            </div>

            <HeaderFleetBadge />
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Body */}
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-3 sm:px-6 pt-4 sm:pt-5 pb-16 sm:pb-20 space-y-5">
        {/* SECTION A: KPI STAT CARDS (1-by-1 sweep stagger right after transition) */}
        <SectionKpiGrid routeSettled={routeSettled} syncKey={syncKey} />

        {/* SECTION B: INGRESS TRAFFIC & EDGE GATEWAY HERO DUO (Each card loads sequentially) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <LazyTelemetrySection
            eager
            routeSettled={routeSettled}
            syncKey={syncKey}
            delayMs={740}
            minHeight={380}
            className="lg:col-span-5 flex flex-col"
          >
            {({ ready }) => (
              <Skeleton
                id="monitoring-ingress-traffic"
                data={ready ? ingressPayload : null}
                skeleton={<ChartCardSkeleton variant="line" minHeight={380} />}
                label="Loading ingress traffic breakdown"
                className={SKELETON_FLEX_CLASS}
              >
                {(payload) => (
                  <TrafficCard
                    title="INGRESS TRAFFIC"
                    unit="reqs"
                    ranges={payload.ranges}
                    channels={payload.channels}
                    className="flex-1"
                  />
                )}
              </Skeleton>
            )}
          </LazyTelemetrySection>

          <LazyTelemetrySection
            eager
            routeSettled={routeSettled}
            syncKey={syncKey}
            delayMs={960}
            minHeight={380}
            className="lg:col-span-7 flex flex-col"
          >
            {({ ready }) => (
              <Skeleton
                id="monitoring-edge-gateway"
                data={ready ? edgeGatewayPayload : null}
                skeleton={<ChartCardSkeleton variant="list" minHeight={380} />}
                label="Loading edge ingress gateway telemetry"
                className={SKELETON_FLEX_CLASS}
              >
                {() => <EdgeGatewayTelemetryCard className="flex-1" />}
              </Skeleton>
            )}
          </LazyTelemetrySection>
        </section>

        {/* SECTION C: PRIMARY TELEMETRY (Each card lazy-loads independently on scroll) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <LazyTelemetrySection
            routeSettled={routeSettled}
            syncKey={syncKey}
            delayMs={180}
            minHeight={360}
            className="lg:col-span-8 flex flex-col"
          >
            {({ ready }) => (
              <Skeleton
                id="monitoring-line-chart"
                data={ready ? timeframe : null}
                skeleton={<ChartCardSkeleton variant="line" minHeight={360} />}
                loading={isTimeframeLoading}
                label="Loading gateway ingress and latency timeline"
                className={SKELETON_FLEX_CLASS}
              >
                {(activeRange) => (
                  <MultiSeriesLineChart
                    title="AZURE LOAD BALANCER GATEWAY INGRESS & LATENCY"
                    timeframe={activeRange}
                    onTimeframeChange={handleTimeframeChange}
                    height={240}
                    className="flex-1"
                  />
                )}
              </Skeleton>
            )}
          </LazyTelemetrySection>

          <LazyTelemetrySection
            routeSettled={routeSettled}
            syncKey={syncKey}
            delayMs={380}
            minHeight={360}
            className="lg:col-span-4 flex flex-col"
          >
            {({ ready }) => (
              <BackendDonutPanel ready={ready} isTimeframeLoading={isTimeframeLoading} />
            )}
          </LazyTelemetrySection>
        </section>

        {/* SECTION D: ACTIVITY HEATMAP & 24-HOUR RADIAL CLOCK (Lazy & sequential on scroll) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <LazyTelemetrySection
            routeSettled={routeSettled}
            syncKey={syncKey}
            delayMs={180}
            minHeight={360}
            className="lg:col-span-8 flex flex-col relative z-20"
          >
            {({ ready }) => (
              <Skeleton
                id="monitoring-heatmap"
                data={ready ? { ready: true } : null}
                skeleton={<ChartCardSkeleton variant="heatmap" minHeight={360} />}
                label="Loading cluster activity heatmap"
                className={SKELETON_FLEX_CLASS}
              >
                {() => <ContributionHeatmapCard className="flex-1" />}
              </Skeleton>
            )}
          </LazyTelemetrySection>

          <LazyTelemetrySection
            routeSettled={routeSettled}
            syncKey={syncKey}
            delayMs={380}
            minHeight={360}
            className="lg:col-span-4 flex flex-col relative z-10"
          >
            {({ ready }) => (
              <Skeleton
                id="monitoring-radial-clock"
                data={ready ? { ready: true } : null}
                skeleton={<ChartCardSkeleton variant="radial" minHeight={360} />}
                label="Loading 24-hour diurnal traffic clock"
                className={SKELETON_FLEX_CLASS}
              >
                {() => <RadialChart className="flex-1" />}
              </Skeleton>
            )}
          </LazyTelemetrySection>
        </section>

        {/* SECTION E: LATENCY RIDGELINE & 60-DAY STATUS STRIPS (Lazy & sequential on scroll) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <LazyTelemetrySection
            routeSettled={routeSettled}
            syncKey={syncKey}
            delayMs={180}
            minHeight={390}
            className="lg:col-span-6 flex flex-col"
          >
            {({ ready }) => (
              <Skeleton
                id="monitoring-ridgeline"
                data={ready ? { ready: true } : null}
                skeleton={<ChartCardSkeleton variant="waves" minHeight={390} />}
                label="Loading per-node latency ridgeline distribution"
                className={SKELETON_FLEX_CLASS}
              >
                {() => <Ridgeline className="flex-1" />}
              </Skeleton>
            )}
          </LazyTelemetrySection>

          <LazyTelemetrySection
            routeSettled={routeSettled}
            syncKey={syncKey}
            delayMs={380}
            minHeight={390}
            className="lg:col-span-6 flex flex-col"
          >
            {({ ready }) => <StatusBarsPanel ready={ready} />}
          </LazyTelemetrySection>
        </section>

        {/* SECTION F: AZURE FLEET TABLE & SLOPE EQUALIZATION CHART (Lazy & sequential on scroll) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <LazyTelemetrySection
            routeSettled={routeSettled}
            syncKey={syncKey}
            delayMs={180}
            minHeight={360}
            className="lg:col-span-8 flex flex-col"
          >
            {({ ready }) => <FleetTablePanel ready={ready} />}
          </LazyTelemetrySection>

          <LazyTelemetrySection
            routeSettled={routeSettled}
            syncKey={syncKey}
            delayMs={380}
            minHeight={360}
            className="lg:col-span-4 flex flex-col"
          >
            {({ ready }) => (
              <Skeleton
                id="monitoring-slope-chart"
                data={ready ? { ready: true } : null}
                skeleton={<ChartCardSkeleton variant="waves" minHeight={360} />}
                label="Loading load balancing slope equalization chart"
                className={SKELETON_FLEX_CLASS}
              >
                {() => <SlopeChart className="flex-1" />}
              </Skeleton>
            )}
          </LazyTelemetrySection>
        </section>

        {/* SECTION G: REAL-TIME DIAGNOSTIC AUDIT & EVENT TICKER (Lazy-loaded on scroll) */}
        <LazyTelemetrySection
          routeSettled={routeSettled}
          syncKey={syncKey}
          delayMs={220}
          minHeight={240}
        >
          {({ ready }) => <AuditTrailPanel ready={ready} />}
        </LazyTelemetrySection>
      </main>

      <ProgressiveBlur className="fixed bottom-0 z-30" height="64px" position="bottom" />
    </div>
  );
}
