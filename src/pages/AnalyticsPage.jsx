import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useTraffic } from '../hooks/useTraffic';
import { useServers } from '../hooks/useServers';
import { useSimulation } from '../hooks/useSimulation';
import { formatNumber, formatMs, formatPercent } from '../utils/formatters';
import {
  CheckCircle,
  Clock,
  Activity,
  Layers
} from 'reicon-react';

export default function AnalyticsPage() {
  const { trafficHistory, metrics } = useTraffic();
  const { servers } = useServers();
  const { targetRps } = useSimulation();

  const [timeFilter, setTimeFilter] = useState('5m'); // '1m' | '5m' | '15m'

  // Server distribution for pie chart
  const pieData = servers.map((s) => ({
    name: s.name,
    value: s.totalRequests || 1,
    color: s.color || '#4D7C5F'
  }));

  const totalSuccess = metrics.successfulRequests;
  const totalFailed = metrics.failedRequests;
  const totalAll = metrics.totalRequests || 1;
  const successPct = ((totalSuccess / totalAll) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Header with Time Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-cream-50 dark:bg-charcoal-800 p-5 rounded-2xl border border-cream-300 dark:border-charcoal-700 shadow-card">
        <div>
          <h2 className="text-lg font-bold text-charcoal-900 dark:text-cream-100">
            Real-Time Cluster Analytics
          </h2>
          <p className="text-xs text-charcoal-500 dark:text-cream-400">
            Live telemetry, error budgets, latency percentiles, and resource utilization
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-cream-200 dark:bg-charcoal-900 p-1 rounded-xl border border-cream-300 dark:border-charcoal-700 text-xs font-semibold">
          {['1m', '5m', '15m'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeFilter(tf)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeFilter === tf
                  ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-800 dark:hover:text-cream-200'
              }`}
            >
              Last {tf === '1m' ? '1 min' : tf === '5m' ? '5 mins' : '15 mins'}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics High-level KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-charcoal-500 uppercase">Availability</span>
            <CheckCircle aria-hidden="true" size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">{successPct}%</div>
          <span className="text-[11px] text-charcoal-400">
            {formatNumber(totalSuccess)} 2xx OK / {formatNumber(totalFailed)} 5xx
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-charcoal-500 uppercase">Avg Response Time</span>
            <Clock aria-hidden="true" size={16} className="text-sage-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-charcoal-900 dark:text-cream-100">
            {formatMs(metrics.avgLatency)}
          </div>
          <span className="text-[11px] text-charcoal-400">Cluster-wide p50 latency</span>
        </div>

        <div className="p-4 rounded-2xl bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-charcoal-500 uppercase">Throughput</span>
            <Activity aria-hidden="true" size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600">{metrics.currentRps} RPS</div>
          <span className="text-[11px] text-charcoal-400">Peak observed: {metrics.peakRps} RPS</span>
        </div>

        <div className="p-4 rounded-2xl bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-charcoal-500 uppercase">Active Connections</span>
            <Layers aria-hidden="true" size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-charcoal-900 dark:text-cream-100">
            {metrics.activeConnectionsTotal}
          </div>
          <span className="text-[11px] text-charcoal-400">Across {servers.length} backend targets</span>
        </div>
      </div>

      {/* Main Charts Row: Throughput & Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Requests Per Second Over Time */}
        <div className="bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-2xl p-5 shadow-card">
          <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100 mb-1">
            Request Throughput Over Time (RPS)
          </h4>
          <p className="text-xs text-charcoal-400 mb-4">Real-time incoming request volume</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="anRps" x1="0" y1="0" x2="0" y2="100%">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE6DA" />
                <XAxis dataKey="time" stroke="#8C9085" fontSize={10} tickLine={false} />
                <YAxis stroke="#8C9085" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 p-2.5 rounded-xl shadow-modal text-xs">
                          <p className="font-mono text-charcoal-400">{payload[0]?.payload.time}</p>
                          <p className="font-bold text-blue-600">RPS: {payload[0]?.value} req/s</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="rps" stroke="#3B82F6" strokeWidth={2} fill="url(#anRps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Success vs Failed Requests */}
        <div className="bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-2xl p-5 shadow-card">
          <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100 mb-1">
            Successful vs Failed Requests
          </h4>
          <p className="text-xs text-charcoal-400 mb-4">HTTP 2xx (Success) vs HTTP 5xx (Outages)</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE6DA" />
                <XAxis dataKey="time" stroke="#8C9085" fontSize={10} tickLine={false} />
                <YAxis stroke="#8C9085" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 p-2.5 rounded-xl shadow-modal text-xs">
                          <p className="font-mono text-charcoal-400">{d.time}</p>
                          <p className="text-emerald-600 font-bold">2xx Success: {d.success}</p>
                          <p className="text-rose-600 font-bold">5xx Failed: {d.failed}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="success" name="Success (2xx)" fill="#10B981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" name="Failed (5xx)" fill="#EF4444" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row: Server Traffic Share & CPU Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart: Traffic Share by Server */}
        <div className="bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100 mb-1">
              Traffic Allocation Share
            </h4>
            <p className="text-xs text-charcoal-400">Share of load routed by algorithm</p>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 p-2 rounded-lg text-xs font-bold">
                          <span style={{ color: d.color }}>{d.name}: </span>
                          <span>{d.value} requests</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            {pieData.map((p) => (
              <span key={p.name} className="flex items-center gap-1 font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* CPU Comparison Chart (2 cols) */}
        <div className="lg:col-span-2 bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-2xl p-5 shadow-card">
          <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100 mb-1">
            Node CPU Utilization Comparison (%)
          </h4>
          <p className="text-xs text-charcoal-400 mb-4">Assessing cluster balance and resource saturation</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE6DA" />
                <XAxis dataKey="time" stroke="#8C9085" fontSize={10} tickLine={false} />
                <YAxis stroke="#8C9085" fontSize={10} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 p-2.5 rounded-xl shadow-modal text-xs space-y-1">
                          <p className="font-mono text-charcoal-400 text-[10px]">{payload[0]?.payload.time}</p>
                          {payload.map((p) => (
                            <div key={p.name} className="flex justify-between gap-3">
                              <span style={{ color: p.color }} className="font-medium">{p.name}:</span>
                              <span className="font-mono font-bold">{p.value}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                {servers.slice(0, 4).map((server, idx) => (
                  <Line
                    key={server.id}
                    type="monotone"
                    dataKey={`srv${idx + 1}Cpu`}
                    name={server.name}
                    stroke={server.color || ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'][idx]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
