import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';

/**
 * StatusBars - Daily 90-day status strip for nodes & services
 * Based on the StatusBars component specification:
 * - Each bar represents a day, colored by operational / degraded / downtime
 * - Hover reveals day's status, exact uptime %, and incident logs
 * - Overall uptime percentage readout
 */
export default function StatusBars({
  label = 'Server A (10.0.1.10)',
  sublabel = 'Azure East US · Standard_D4s_v5',
  maxDays = 60,
  incidents = [],
  uptime = 99.98,
  className = '',
}) {
  const [hoveredDay, setHoveredDay] = useState(null);

  // Generate day items
  const days = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = maxDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Check incident match
      const inc = incidents.find((item) => item.date === dateStr);
      let status = 'operational';
      let title = '100% Operational';
      let minutes = 0;

      if (inc) {
        if (inc.downtime) {
          status = 'downtime';
          title = inc.incidents?.[0]?.title || 'Node Outage / Restart';
          minutes = inc.downtime;
        } else if (inc.degraded) {
          status = 'degraded';
          title = inc.incidents?.[0]?.title || 'Elevated Latency / Skew';
          minutes = inc.degraded;
        }
      }

      list.push({
        date: dateStr,
        dayNum: i,
        status,
        title,
        minutes,
      });
    }
    return list;
  }, [maxDays, incidents]);

  return (
    <div className={cn('p-3 rounded-xl bg-white/70 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10 select-none', className)}>
      {/* Top Header: Node Name on left, Uptime % on right */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
            {label}
          </span>
          {sublabel && (
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 ml-2">
              {sublabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {uptime}% uptime
          </span>
        </div>
      </div>

      {/* Bar Strip */}
      <div className="relative flex items-center gap-[2px] h-7 w-full py-1">
        {days.map((d, idx) => {
          let bgClass = 'bg-emerald-500 hover:bg-emerald-400';
          if (d.status === 'degraded') {
            bgClass = 'bg-amber-500 hover:bg-amber-400';
          } else if (d.status === 'downtime') {
            bgClass = 'bg-rose-500 hover:bg-rose-400';
          }

          const isHovered = hoveredDay?.date === d.date;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredDay(d)}
              onMouseLeave={() => setHoveredDay(null)}
              className={cn(
                'flex-1 h-full rounded-[1.5px] transition-all cursor-pointer',
                bgClass,
                isHovered && 'scale-y-125 brightness-125 z-10 ring-1 ring-neutral-900 dark:ring-white'
              )}
            />
          );
        })}
      </div>

      {/* Footer Info: Range & Day Tooltip */}
      <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
        <span>{maxDays} days ago</span>
        <div>
          {hoveredDay ? (
            <span className="font-semibold text-neutral-900 dark:text-white">
              {hoveredDay.date}:{' '}
              <span
                className={cn(
                  hoveredDay.status === 'operational'
                    ? 'text-emerald-500'
                    : hoveredDay.status === 'degraded'
                    ? 'text-amber-500'
                    : 'text-rose-500'
                )}
              >
                {hoveredDay.title} {hoveredDay.minutes ? `(${hoveredDay.minutes}m)` : ''}
              </span>
            </span>
          ) : (
            <span>Today</span>
          )}
        </div>
      </div>
    </div>
  );
}
