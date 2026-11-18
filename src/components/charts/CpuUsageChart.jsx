import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useSimulationStore } from '../../store/simulationStore';

export default function CpuUsageChart() {
  const trafficHistory = useSimulationStore((state) => state.trafficHistory);
  const servers = useSimulationStore((state) => state.servers);

  return (
    <div className="bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100">
            Node CPU Utilization Trends
          </h4>
          <p className="text-xs text-charcoal-400">Comparing real-time processor load across server instances</p>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              unit="%"
              domain={[0, 100]}
            />
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
  );
}
