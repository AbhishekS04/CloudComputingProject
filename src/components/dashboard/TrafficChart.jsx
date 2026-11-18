import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useTraffic } from '../../hooks/useTraffic';

export default function TrafficChart() {
  const { trafficHistory } = useTraffic();

  return (
    <div className="bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl p-5 shadow-subtle">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100">
            Real-Time Traffic Throughput
          </h4>
          <p className="text-xs text-charcoal-400">Total requests per second (RPS) streaming into load balancer</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="rpsGradient" x1="0" y1="0" x2="0" y2="100%">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
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
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 p-2.5 rounded-xl shadow-modal text-xs">
                      <p className="font-mono text-charcoal-400 text-[10px]">{d.time}</p>
                      <p className="text-blue-600 font-bold">Throughput: {d.rps} req/s</p>
                      <p className="text-emerald-600">Success: {d.success}</p>
                      {d.failed > 0 && <p className="text-rose-600">Failed: {d.failed}</p>}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="rps"
              name="Throughput (RPS)"
              stroke="#3B82F6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#rpsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
