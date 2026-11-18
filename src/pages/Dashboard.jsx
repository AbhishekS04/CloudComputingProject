import React from 'react';
import MetricCard from '../components/dashboard/MetricCard';
import SimulationControls from '../components/controls/SimulationControls';
import Visualizer from '../components/visualizer/Visualizer';
import TrafficChart from '../components/dashboard/TrafficChart';
import RequestDistribution from '../components/charts/RequestDistribution';
import ServerStatus from '../components/dashboard/ServerStatus';
import { useSimulation } from '../hooks/useSimulation';
import { useServers } from '../hooks/useServers';
import { formatNumber, formatMs } from '../utils/formatters';
import {
  Activity,
  Zap,
  Clock,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  Bell
} from 'lucide-react';

export default function Dashboard() {
  const { metrics, events, targetRps, algorithm } = useSimulation();
  const { servers, activeServersCount, totalServers } = useServers();

  return (
    <div className="space-y-6">
      {/* 1. Master Simulation Controls Dock */}
      <SimulationControls />

      {/* 2. Top 4 Live Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Incoming Requests"
          value={formatNumber(metrics.totalRequests)}
          subtitle="Total requests dispatched"
          icon={Layers}
          trend="+100%"
          trendLabel="All-time session"
          trendDirection="up"
          sparklineData={[12, 19, 25, 32, 45, 58, 70, 95]}
        />

        <MetricCard
          title="Requests Per Second"
          value={`${metrics.currentRps} RPS`}
          subtitle={`Target capacity: ${targetRps} req/s`}
          icon={Zap}
          trend={metrics.currentRps >= targetRps ? 'Nominal' : 'Pacing'}
          trendDirection={metrics.currentRps > 0 ? 'up' : 'neutral'}
          sparklineData={[4, 6, 8, 7, 12, 10, 8, metrics.currentRps]}
        />

        <MetricCard
          title="Average Latency"
          value={formatMs(metrics.avgLatency)}
          subtitle="Round-trip network time"
          icon={Clock}
          trend={metrics.avgLatency < 40 ? 'Optimal (<40ms)' : 'Elevated'}
          trendDirection={metrics.avgLatency < 40 ? 'up' : 'down'}
          sparklineData={[28, 25, 23, 22, 21, 24, 22, metrics.avgLatency]}
        />

        <MetricCard
          title="Active Server Pool"
          value={`${activeServersCount} / ${totalServers}`}
          subtitle={`${servers.filter((s) => s.status === 'healthy').length} healthy, ${servers.filter((s) => s.status === 'degraded').length} degraded`}
          icon={Server}
          trend={`${Math.round((activeServersCount / (totalServers || 1)) * 100)}% Available`}
          trendDirection={activeServersCount === totalServers ? 'up' : 'down'}
          sparklineData={[3, 3, 3, 3, 2, 3, activeServersCount]}
        />
      </div>

      {/* 3. Main Infrastructure Visualizer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sage-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-700 dark:text-cream-300">
              Live Network Flow Visualization
            </h2>
          </div>
          <span className="text-xs text-charcoal-400 font-mono">
            Algorithm: {algorithm.replace(/_/g, ' ')}
          </span>
        </div>

        <Visualizer showInspector={true} />
      </div>

      {/* 4. Charts & Live Server Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrafficChart />
        <RequestDistribution />
      </div>

      {/* 5. Health Summary & Recent System Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServerStatus />

        {/* Live Cluster Event Log */}
        <div className="bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-sage-600" />
              <div>
                <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100">
                  Recent Cluster Events & Routing Log
                </h4>
                <p className="text-xs text-charcoal-400">Audit trail of load balancing actions</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-charcoal-400">
              {events.length} events logged
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {events.slice(0, 8).map((evt) => {
              const isSuccess = evt.type === 'success';
              const isWarning = evt.type === 'warning';
              const isError = evt.type === 'error';

              return (
                <div
                  key={evt.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700 text-xs"
                >
                  <div className="mt-0.5">
                    {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    {isWarning && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                    {isError && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                    {!isSuccess && !isWarning && !isError && (
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-charcoal-800 dark:text-cream-100">
                        {evt.title}
                      </span>
                      <span className="text-[10px] font-mono text-charcoal-400">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-charcoal-500 dark:text-cream-300 mt-0.5 leading-relaxed text-[11px]">
                      {evt.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
