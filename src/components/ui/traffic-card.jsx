import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Built-in traffic channel color palette
const DEFAULT_PALETTE = [
  '#3B82F6', // Direct - Blue
  '#10B981', // Referral - Emerald
  '#F59E0B', // Social - Amber
  '#8B5CF6', // Search - Violet
  '#EC4899', // Paid - Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

/**
 * EasyUI TrafficCard Component
 * Stacked column SVG chart where each channel is its own rounded capsule,
 * with count-up headline total, Day/Week range switcher, light/dark mode,
 * and full keyboard/screen-reader accessibility.
 */
export function TrafficCard({
  ranges = [],
  channels = [],
  defaultRange,
  onRangeChange,
  title = 'Traffic',
  unit = 'visits',
  format = (n) => new Intl.NumberFormat('en-US').format(Math.round(n)),
  height = 132,
  animated = true,
  className = '',
}) {
  const prefersReduced = useReducedMotion();
  const shouldAnimate = animated && !prefersReduced;

  // Active range selection
  const initialRangeId = defaultRange || ranges[0]?.id || 'day';
  const [selectedRangeId, setSelectedRangeId] = useState(initialRangeId);
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
  const [activeChannelId, setActiveChannelId] = useState(null);

  // Sync with defaultRange prop if it changes externally
  useEffect(() => {
    if (defaultRange && defaultRange !== selectedRangeId) {
      setSelectedRangeId(defaultRange);
    }
  }, [defaultRange]);

  const activeRange = useMemo(() => {
    return ranges.find((r) => r.id === selectedRangeId) || ranges[0] || { points: [] };
  }, [ranges, selectedRangeId]);

  const points = activeRange.points || [];

  // Channel definitions with fallback colors
  const resolvedChannels = useMemo(() => {
    return channels.map((c, i) => ({
      ...c,
      color: c.color || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
    }));
  }, [channels]);

  // Calculate totals
  const pointTotals = useMemo(() => {
    return points.map((p) => {
      const sum = Object.values(p.values || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
      return sum;
    });
  }, [points]);

  const maxColumnTotal = useMemo(() => {
    return Math.max(...pointTotals, 1);
  }, [pointTotals]);

  const rangeTotal = useMemo(() => {
    if (typeof activeRange.total === 'number') {
      return activeRange.total;
    }
    return pointTotals.reduce((acc, val) => acc + val, 0);
  }, [activeRange, pointTotals]);

  // Current headline display number (either hovered column or full range total)
  const currentTotal = hoveredPointIndex !== null && pointTotals[hoveredPointIndex] !== undefined
    ? pointTotals[hoveredPointIndex]
    : rangeTotal;

  // Animated count-up headline
  const [displayTotal, setDisplayTotal] = useState(currentTotal);
  const prevTotalRef = useRef(currentTotal);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayTotal(currentTotal);
      prevTotalRef.current = currentTotal;
      return;
    }

    const start = prevTotalRef.current;
    const end = currentTotal;
    const duration = 500;
    const startTime = performance.now();

    let frameId;
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = start + (end - start) * ease;
      setDisplayTotal(val);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        prevTotalRef.current = end;
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [currentTotal, shouldAnimate]);

  const handleRangeSelect = (rangeId) => {
    setSelectedRangeId(rangeId);
    setHoveredPointIndex(null);
    if (onRangeChange) {
      onRangeChange(rangeId);
    }
  };

  // Keyboard navigation for chart columns
  const columnRefs = useRef([]);
  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(points.length - 1, index + 1);
      columnRefs.current[next]?.focus();
      setHoveredPointIndex(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = Math.max(0, index - 1);
      columnRefs.current[prev]?.focus();
      setHoveredPointIndex(prev);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setHoveredPointIndex(null);
    }
  };

  // SVG Chart Dimensions & Layout
  const svgWidth = 600;
  const chartHeight = height;
  const paddingBottom = 6;
  const paddingTop = 6;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const numPoints = points.length || 1;
  const colSpacing = svgWidth / numPoints;
  const colWidth = Math.max(5, Math.min(22, colSpacing * 0.62));
  const capsuleGap = 2; // Gap between capsules in a stack

  // Generate unique id for ARIA
  const headingId = useId();

  return (
    <div
      className={cn(
        'relative bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xs transition-all duration-200 select-none text-neutral-900 dark:text-neutral-100 font-sans',
        className
      )}
      aria-labelledby={headingId}
    >
      {/* Top Header: Title & Switcher */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3
          id={headingId}
          className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          {title}
        </h3>

        {/* Range Switcher (Day / Week / etc.) */}
        {ranges.length > 1 && (
          <div
            role="tablist"
            aria-label={`${title} time range`}
            className="flex items-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06]"
          >
            {ranges.map((range) => {
              const isSelected = range.id === selectedRangeId;
              return (
                <button
                  key={range.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleRangeSelect(range.id)}
                  className={cn(
                    'relative px-3 py-0.5 text-xs rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer',
                    isSelected
                      ? 'text-neutral-900 dark:text-white font-semibold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium'
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="easyui-traffic-card-tab-indicator"
                      className="absolute inset-0 bg-white dark:bg-[#202227] rounded-full shadow-xs"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10">{range.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Metric Headline & Caption */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {format(displayTotal)}
          </span>
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {hoveredPointIndex !== null ? `${unit} · ${points[hoveredPointIndex]?.label}` : unit}
          </span>
        </div>

        {activeRange.caption && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
            {activeRange.caption}
          </p>
        )}
      </div>

      {/* SVG Stacked Column Chart */}
      <div className="relative w-full overflow-visible">
        <svg
          viewBox={`0 0 ${svgWidth} ${chartHeight}`}
          className="w-full overflow-visible"
          style={{ height }}
          role="img"
          aria-label={`${title} stacked capsule column chart`}
        >
          {/* Subtle horizontal grid lines */}
          <line
            x1="0"
            y1={chartHeight - paddingBottom}
            x2={svgWidth}
            y2={chartHeight - paddingBottom}
            stroke="currentColor"
            className="text-[#DDD6C6]/40 dark:text-charcoal-800"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1={paddingTop + usableHeight * 0.5}
            x2={svgWidth}
            y2={paddingTop + usableHeight * 0.5}
            stroke="currentColor"
            className="text-[#DDD6C6]/25 dark:text-charcoal-800"
            strokeDasharray="3 3"
            strokeWidth="1"
          />

          {/* Render Columns */}
          {points.map((pt, ptIdx) => {
            const centerX = (ptIdx + 0.5) * colSpacing;
            const colX = centerX - colWidth / 2;
            const isHovered = hoveredPointIndex === ptIdx;

            // Compute stacked capsule rects for this point
            let currentY = chartHeight - paddingBottom;
            const segments = resolvedChannels.map((channel) => {
              const val = Number(pt.values?.[channel.id]) || 0;
              const rawHeight = maxColumnTotal > 0 ? (val / maxColumnTotal) * usableHeight : 0;
              // If the segment height is smaller than gap, reduce gap
              const segHeight = Math.max(0, rawHeight - capsuleGap);
              const y = currentY - rawHeight;
              const capsuleY = y + capsuleGap / 2;
              currentY -= rawHeight;

              const rx = Math.min(colWidth / 2, Math.max(1, segHeight / 2), 4);
              const isChannelDimmed = activeChannelId && activeChannelId !== channel.id;

              return {
                channel,
                val,
                colX,
                capsuleY,
                colWidth,
                segHeight,
                rx,
                isChannelDimmed,
              };
            });

            return (
              <g
                key={pt.label || ptIdx}
                className="group cursor-pointer focus:outline-none"
                tabIndex={0}
                ref={(el) => (columnRefs.current[ptIdx] = el)}
                onMouseEnter={() => setHoveredPointIndex(ptIdx)}
                onMouseLeave={() => setHoveredPointIndex(null)}
                onFocus={() => setHoveredPointIndex(ptIdx)}
                onBlur={() => setHoveredPointIndex(null)}
                onKeyDown={(e) => handleKeyDown(e, ptIdx)}
                role="button"
                aria-label={`${pt.label}: ${format(pointTotals[ptIdx])} ${unit}`}
              >
                {/* Invisible larger hit area for easier hover/touch */}
                <rect
                  x={centerX - colSpacing / 2}
                  y="0"
                  width={colSpacing}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Column background hover pill */}
                {isHovered && (
                  <rect
                    x={colX - 3}
                    y={paddingTop}
                    width={colWidth + 6}
                    height={usableHeight}
                    rx="6"
                    className="fill-charcoal-900/5 dark:fill-cream-100/10 pointer-events-none"
                  />
                )}

                {/* Channel Capsules stacked bottom-to-top */}
                {segments.map((seg) => {
                  if (seg.segHeight <= 0.5) return null;
                  return (
                    <motion.rect
                      key={seg.channel.id}
                      x={seg.colX}
                      y={seg.capsuleY}
                      width={seg.colWidth}
                      height={seg.segHeight}
                      rx={seg.rx}
                      ry={seg.rx}
                      fill={seg.channel.color}
                      initial={shouldAnimate ? { scaleY: 0, opacity: 0 } : false}
                      animate={{
                        scaleY: 1,
                        opacity: seg.isChannelDimmed ? 0.3 : isHovered ? 1 : 0.9,
                      }}
                      transition={{
                        duration: 0.35,
                        delay: shouldAnimate ? ptIdx * 0.015 : 0,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{ transformOrigin: 'bottom' }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip when column is hovered/focused */}
        <AnimatePresence>
          {hoveredPointIndex !== null && points[hoveredPointIndex] && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                left: `${((hoveredPointIndex + 0.5) / numPoints) * 100}%`,
                transform: 'translateX(-50%)',
              }}
              className="absolute -top-16 pointer-events-none z-30 min-w-[140px] px-2.5 py-1.5 rounded-xl bg-charcoal-900 dark:bg-charcoal-950 text-white text-[11px] shadow-lg border border-charcoal-700/80 backdrop-blur-xs"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 mb-1">
                <span className="font-bold text-cream-100 font-mono">
                  {points[hoveredPointIndex].label}
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {format(pointTotals[hoveredPointIndex])}
                </span>
              </div>
              <div className="space-y-0.5">
                {resolvedChannels.map((c) => {
                  const val = points[hoveredPointIndex]?.values?.[c.id] || 0;
                  return (
                    <div key={c.id} className="flex items-center justify-between text-[10px] gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-cream-300 truncate">{c.label}</span>
                      </div>
                      <span className="font-mono text-cream-100 font-semibold">{format(val)}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Channel Legend (Interactive highlight) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.06] font-sans">
        {resolvedChannels.map((channel) => {
          const isDimmed = activeChannelId && activeChannelId !== channel.id;
          return (
            <button
              key={channel.id}
              onClick={() =>
                setActiveChannelId((prev) => (prev === channel.id ? null : channel.id))
              }
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium transition-all rounded-full px-2 py-0.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer',
                isDimmed ? 'opacity-40' : 'opacity-100'
              )}
            >
              <span
                className="w-2.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: channel.color }}
              />
              <span className="text-neutral-600 dark:text-neutral-300">{channel.label}</span>
            </button>
          );
        })}
      </div>

      {/* Screen-Reader Accessible Data Table */}
      <table className="sr-only">
        <caption>
          {title} - {activeRange.caption || activeRange.label}
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {resolvedChannels.map((c) => (
              <th key={c.id} scope="col">
                {c.label}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {points.map((pt, i) => (
            <tr key={pt.label || i}>
              <th scope="row">{pt.label}</th>
              {resolvedChannels.map((c) => (
                <td key={c.id}>{format(pt.values?.[c.id] || 0)}</td>
              ))}
              <td>{format(pointTotals[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TrafficCard;
