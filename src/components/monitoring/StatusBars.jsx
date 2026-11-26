import React, { useState, useMemo, memo } from 'react';
import { cn } from '../../lib/utils';

const DAY_MS = 86400000;

/**
 * StatusBars - Clean 60-day availability strip per node (borderless subtle track rows).
 */
const StatusBars = memo(function StatusBars({
  label = 'Server A',
  sublabel = '',
  maxDays = 60,
  incidents = [],
  uptime = 99.98,
  className = '',
}) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const days = useMemo(() => {
    const incidentMap = new Map();
    for (const item of incidents) {
      incidentMap.set(item.date, item);
    }
    const list = new Array(maxDays);
    const now = new Date();
    const todayMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = maxDays - 1, idx = 0; i >= 0; i--, idx++) {
      const dateStr = new Date(todayMidnight - i * DAY_MS).toISOString().slice(0, 10);
      const inc = incidentMap.get(dateStr);
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

      list[idx] = { date: dateStr, dayNum: i, status, title, minutes };
    }
    return list;
  }, [maxDays, incidents]);

  return (
    <div
      className={cn(
        'px-3.5 py-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.025] select-none font-sans',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0 truncate">
          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
            {label}
          </span>
          {sublabel && (
            <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 ml-2">
              {sublabel}
            </span>
          )}
        </div>
        <span className="text-xs font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
          {uptime}%
        </span>
      </div>

      <div className="relative flex items-center gap-[2px] h-6 w-full py-0.5">
        {days.map((d, idx) => {
          let bgClass = 'bg-emerald-500/85 hover:bg-emerald-400';
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
                'flex-1 h-full rounded-[1.5px] transition-transform duration-150 cursor-pointer',
                bgClass,
                isHovered && 'scale-y-125 brightness-110 z-10 ring-1 ring-neutral-900/60 dark:ring-white/80'
              )}
            />
          );
        })}
      </div>

      {hoveredDay && (
        <div className="mt-1.5 text-[11px] text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
          <span className="font-mono text-neutral-400">{hoveredDay.date}</span>
          <span
            className={cn(
              'font-medium',
              hoveredDay.status === 'operational'
                ? 'text-emerald-600 dark:text-emerald-400'
                : hoveredDay.status === 'degraded'
                ? 'text-amber-500'
                : 'text-rose-500'
            )}
          >
            {hoveredDay.title} {hoveredDay.minutes ? `(${hoveredDay.minutes}m)` : ''}
          </span>
        </div>
      )}
    </div>
  );
});

export default StatusBars;
