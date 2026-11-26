import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const DAY_MS = 86400000;

/**
 * StatusBars - Smooth 60-day availability strip per node with soft proximity hover & gliding tooltip.
 */
const StatusBars = memo(function StatusBars({
  label = 'Server A',
  sublabel = '',
  maxDays = 60,
  incidents = [],
  uptime = 99.98,
  className = '',
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

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

  const hoveredDay = hoveredIdx !== null ? days[hoveredIdx] : null;
  const tooltipLeftPct =
    hoveredIdx !== null
      ? Math.min(86, Math.max(14, ((hoveredIdx + 0.5) / days.length) * 100))
      : 50;

  return (
    <div
      className={cn(
        'group/row px-3.5 py-3 rounded-xl bg-black/[0.02] hover:bg-black/[0.035] dark:bg-white/[0.025] dark:hover:bg-white/[0.045] transition-colors duration-300 ease-out select-none font-sans',
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

      {/* Continuous gap-free hover surface + floating gliding tooltip (zero layout jump) */}
      <div
        className="relative flex items-center h-7 w-full"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <AnimatePresence>
          {hoveredDay && (
            <motion.div
              key="status-day-tooltip"
              initial={{ opacity: 0, x: '-50%', y: 4, scale: 0.96, filter: 'blur(3px)' }}
              animate={{
                opacity: 1,
                x: '-50%',
                y: 0,
                scale: 1,
                filter: 'blur(0px)',
                left: `${tooltipLeftPct}%`,
              }}
              exit={{ opacity: 0, x: '-50%', y: 3, scale: 0.97, filter: 'blur(2px)' }}
              transition={{
                left: { type: 'spring', stiffness: 320, damping: 28, mass: 0.7 },
                opacity: { duration: 0.16, ease: 'easeOut' },
                y: { type: 'spring', stiffness: 320, damping: 26 },
                scale: { duration: 0.16, ease: 'easeOut' },
                filter: { duration: 0.15 },
              }}
              className="pointer-events-none absolute bottom-full mb-1.5 z-30 whitespace-nowrap rounded-xl px-2.5 py-1.5 bg-white/95 dark:bg-[#1b1d24]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.12] shadow-lg shadow-black/10 dark:shadow-black/50 flex items-center gap-2 text-[11px]"
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  hoveredDay.status === 'operational'
                    ? 'bg-emerald-500'
                    : hoveredDay.status === 'degraded'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                )}
              />
              <span className="font-mono text-[10.5px] text-neutral-500 dark:text-neutral-400">
                {hoveredDay.date}
              </span>
              <span className="text-neutral-300 dark:text-neutral-600">·</span>
              <span
                className={cn(
                  'font-medium',
                  hoveredDay.status === 'operational'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : hoveredDay.status === 'degraded'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {hoveredDay.title}
                {hoveredDay.minutes ? ` (${hoveredDay.minutes}m)` : ''}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {days.map((d, idx) => {
          const dist = hoveredIdx !== null ? Math.abs(idx - hoveredIdx) : null;

          let colorClass = 'bg-emerald-500/85';
          let glowClass = 'shadow-[0_0_10px_rgba(16,185,129,0.45)] bg-emerald-400';
          if (d.status === 'degraded') {
            colorClass = 'bg-amber-500/90';
            glowClass = 'shadow-[0_0_10px_rgba(245,158,11,0.5)] bg-amber-400';
          } else if (d.status === 'downtime') {
            colorClass = 'bg-rose-500/90';
            glowClass = 'shadow-[0_0_10px_rgba(244,63,94,0.5)] bg-rose-400';
          }

          let waveStyle;
          if (dist === 0) {
            waveStyle = { transform: 'scaleY(1.24)', opacity: 1 };
          } else if (dist === 1) {
            waveStyle = { transform: 'scaleY(1.13)', opacity: 0.95 };
          } else if (dist === 2) {
            waveStyle = { transform: 'scaleY(1.06)', opacity: 0.85 };
          } else if (hoveredIdx !== null) {
            waveStyle = { transform: 'scaleY(1)', opacity: 0.55 };
          } else {
            waveStyle = { transform: 'scaleY(1)', opacity: 0.92 };
          }

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              className="flex-1 h-full flex items-center px-[1px] cursor-pointer"
            >
              <div
                style={waveStyle}
                className={cn(
                  'w-full h-5 rounded-[2.5px] transition-[transform,opacity,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-center',
                  dist === 0 ? glowClass : colorClass
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default StatusBars;
