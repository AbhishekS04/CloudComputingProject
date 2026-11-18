import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useTraffic } from '../../hooks/useTraffic';

export default function LatencyChart() {
  const { trafficHistory } = useTraffic();

  return (
    <div className="bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100">
            Latency & Response Times
          </h4>
          <p className="text-xs text-charcoal-400">Average round-trip response duration (ms)</p>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="100%">
                <stop offset="5%" stopColor="#4D7C5F" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#4D7C5F" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE6DA" />
            <XAxis
              dataKey="time"
              stroke="#8C9085"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#DDD6C6' }}
            />
            <YAxis
              stroke="#8C9085"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#DDD6C6' }}
              unit="ms"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 p-2.5 rounded-xl shadow-modal text-xs">
                      <p className="font-mono text-charcoal-400 text-[10px]">{d.time}</p>
                      <p className="text-sage-700 font-bold">Latency: {d.latency} ms</p>
                      <p className="text-charcoal-500">RPS: {d.rps} req/s</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="latency"
              stroke="#4D7C5F"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#latencyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
