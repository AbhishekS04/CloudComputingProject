import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useServers } from '../../hooks/useServers';

export default function RequestDistribution() {
  const { servers } = useServers();

  const data = servers.map((s) => ({
    name: s.name,
    requests: s.totalRequests,
    active: s.activeConnections,
    color: s.color || '#4D7C5F'
  }));

  return (
    <div className="bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl p-5 shadow-subtle">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100">
            Request Distribution
          </h4>
          <p className="text-xs text-charcoal-400">Total requests processed by each backend node</p>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              stroke="#8C9085"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#DDD6C6' }}
            />
            <YAxis
              stroke="#8C9085"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#DDD6C6' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 p-2.5 rounded-xl shadow-modal text-xs">
                      <p className="font-bold text-charcoal-800 dark:text-cream-100">{d.name}</p>
                      <p className="text-charcoal-500">Processed: <strong className="text-charcoal-800 dark:text-cream-200">{d.requests}</strong></p>
                      <p className="text-charcoal-500">Active Conns: <strong className="text-charcoal-800 dark:text-cream-200">{d.active}</strong></p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="requests" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
