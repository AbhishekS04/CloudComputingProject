import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';

/**
 * ActivityHeatmap - Cluster Traffic Load Density Matrix
 * Based on UI Arc ActivityHeatmap & Reference Image 1 (TransGlobal)
 * Features:
 * - 7 Rows (Mon - Sun) x 24 Columns (00:00 - 23:00)
 * - Intensity color levels based on throughput
 * - Interactive hover card with day, time, RPS count, and load classification
 * - Min / Avg / Max headline metrics
 */
export default function ActivityHeatmap({
  data,
  label = 'Cluster Load Density',
  period = 'Past 7 Days (168 Hours)',
  className = '',
}) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [timeRange, setTimeRange] = useState('Week');

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Generate realistic traffic matrix if not passed
  const matrix = useMemo(() => {
    if (data && data.length > 0) return data;
    const generated = [];
    daysOfWeek.forEach((day, dIdx) => {
      hours.forEach((hour) => {
        // Business hours peak (09:00 - 18:00)
        const isPeak = hour >= 9 && hour <= 18;
        const isWeekend = dIdx >= 5;
        const base = isWeekend ? 60 : 120;
        const multiplier = isPeak ? 1.8 + Math.sin(hour / 3) * 0.4 : 0.6;
        const count = Math.round(base * multiplier + (Math.random() * 30 - 15));
        generated.push({
          day,
          dIdx,
          hour,
          time: `${String(hour).padStart(2, '0')}:00`,
          count,
        });
      });
    });
    return generated;
  }, [data]);

  // Compute Min, Avg, Max
  const { minCount, maxCount, avgCount } = useMemo(() => {
    const counts = matrix.map((c) => c.count);
    const min = Math.min(...counts, 0);
    const max = Math.max(...counts, 200);
    const sum = counts.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / (counts.length || 1));
    return { minCount: min, maxCount: max, avgCount: avg };
  }, [matrix]);

  // Color intensity scale
  const getCellColor = (count) => {
    const ratio = (count - minCount) / (maxCount - minCount || 1);
    if (ratio < 0.2) return 'bg-amber-950/20 dark:bg-amber-950/40 border-amber-900/10 text-transparent';
    if (ratio < 0.4) return 'bg-amber-800/40 dark:bg-amber-800/50 border-amber-700/20';
    if (ratio < 0.65) return 'bg-amber-600/70 dark:bg-amber-600/80 border-amber-500/30';
    if (ratio < 0.85) return 'bg-amber-500 dark:bg-amber-500 border-amber-400/40 shadow-xs';
    return 'bg-amber-400 dark:bg-amber-300 border-amber-200 shadow-xs';
  };

  return (
    <div className={cn('flex flex-col select-none', className)}>
      {/* Top Header & Range Filters (Matching Reference Image 1) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {label}
          </span>
          <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
            {period}
          </div>
        </div>

        {/* Range Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-white/10 text-[11px] font-mono">
          {['Day', 'Week', 'Month', 'Year'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTimeRange(tab)}
              className={cn(
                'px-2.5 py-0.5 rounded-[5px] transition-all cursor-pointer',
                timeRange === tab
                  ? 'bg-white dark:bg-[#2A2A2A] text-neutral-900 dark:text-white shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Metric Badges (from Image 1: Minimal, Average, Maximum) */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
            <span>Minimal</span>
            <span>↘</span>
          </div>
          <div className="text-lg font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
            {minCount} <span className="text-[10px] font-normal text-neutral-500">req/s</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
            <span>Average</span>
            <span>↗</span>
          </div>
          <div className="text-lg font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
            {avgCount} <span className="text-[10px] font-normal text-neutral-500">req/s</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
            <span>Peak Spike</span>
            <span>↗</span>
          </div>
          <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            {maxCount} <span className="text-[10px] font-normal text-neutral-500">req/s</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid (7 Rows x 24 Columns) */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[480px]">
          {/* Hour tick markers */}
          <div className="flex items-center mb-1 pl-9 pr-1">
            {[0, 3, 6, 9, 12, 15, 18, 21].map((hr) => (
              <span
                key={hr}
                className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500"
                style={{ width: `${(100 / 8)}%` }}
              >
                {String(hr).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {/* 7 Days Rows */}
          {daysOfWeek.map((day, dIdx) => (
            <div key={day} className="flex items-center gap-1.5 mb-1.5">
              <span className="w-7 text-[10px] font-mono font-medium text-neutral-500 dark:text-neutral-400 shrink-0">
                {day}
              </span>
              <div className="flex-1 grid grid-cols-24 gap-1">
                {hours.map((hour) => {
                  const cell = matrix.find((c) => c.dIdx === dIdx && c.hour === hour) || {
                    day,
                    dIdx,
                    hour,
                    time: `${hour}:00`,
                    count: 0,
                  };
                  const colorClass = getCellColor(cell.count);
                  const isHovered = hoveredCell === cell;

                  return (
                    <div
                      key={hour}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={cn(
                        'h-4.5 rounded-[3px] border transition-all duration-150 cursor-pointer',
                        colorClass,
                        isHovered && 'scale-125 z-10 ring-2 ring-neutral-900 dark:ring-white border-white'
                      )}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip & Legend Bar */}
      <div className="flex items-center justify-between mt-3 text-[10px] font-mono text-neutral-500">
        <div>
          {hoveredCell ? (
            <span className="font-semibold text-neutral-900 dark:text-white">
              {hoveredCell.day} {hoveredCell.time} —{' '}
              <span className="text-amber-500 font-bold">{hoveredCell.count} req/s</span>
            </span>
          ) : (
            <span>Hover any cell to inspect hourly traffic</span>
          )}
        </div>

        {/* Intensity Gradient Legend */}
        <div className="flex items-center gap-1.5">
          <span>Low</span>
          <div className="flex items-center gap-0.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-950/20 dark:bg-amber-950/40 border border-amber-900/10" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-800/40 dark:bg-amber-800/50" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-600/70 dark:bg-amber-600/80" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-500" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-300" />
          </div>
          <span>Peak</span>
        </div>
      </div>
    </div>
  );
}
