import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';

/**
 * DonutChart - Arc morphing donut chart with rolling center readout and synced legend
 * Following UI Arc specification & Apple HIG design tokens
 */
export default function DonutChart({
  data = [],
  label = 'Traffic by Service',
  unit = 'req/s',
  totalLabel = 'Total Ingress',
  size = 220,
  thickness = 28,
  formatValue = (v) => v.toLocaleString(),
  className = '',
}) {
  const [activeKey, setActiveKey] = useState(null);
  const [hiddenKeys, setHiddenKeys] = useState([]);

  // Filter out zero or negative and hidden items
  const visibleData = useMemo(() => {
    return data.filter((d) => d.value > 0 && !hiddenKeys.includes(d.key));
  }, [data, hiddenKeys]);

  const total = useMemo(() => {
    return visibleData.reduce((acc, d) => acc + d.value, 0);
  }, [visibleData]);

  const activeItem = useMemo(() => {
    return visibleData.find((d) => d.key === activeKey) || null;
  }, [visibleData, activeKey]);

  // Compute arc angles
  const radius = size / 2;
  const innerRadius = radius - thickness;
  const circumference = 2 * Math.PI * (radius - thickness / 2);

  // Default color palette for cloud protocols
  const defaultColors = [
    '#3B82F6', // Blue (HTTP/2)
    '#10B981', // Emerald (WebSocket)
    '#8B5CF6', // Purple (gRPC)
    '#F59E0B', // Amber (REST API)
    '#EC4899', // Pink (Static Assets)
    '#64748B', // Slate (Health & Probes)
  ];

  // Calculate arc slices
  let cumulativeAngle = -90; // Start at top
  const slices = visibleData.map((d, i) => {
    const fraction = total > 0 ? d.value / total : 0;
    const sweepAngle = fraction * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += sweepAngle;
    const endAngle = cumulativeAngle;

    const color = d.color || defaultColors[i % defaultColors.length];

    // SVG arc path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = radius + radius * Math.cos(startRad);
    const y1 = radius + radius * Math.sin(startRad);
    const x2 = radius + radius * Math.cos(endRad);
    const y2 = radius + radius * Math.sin(endRad);

    const x3 = radius + innerRadius * Math.cos(endRad);
    const y3 = radius + innerRadius * Math.sin(endRad);
    const x4 = radius + innerRadius * Math.cos(startRad);
    const y4 = radius + innerRadius * Math.sin(startRad);

    const largeArc = sweepAngle > 180 ? 1 : 0;

    const pathData = sweepAngle >= 359.9
      ? `M ${radius + radius} ${radius}
         A ${radius} ${radius} 0 1 0 ${radius - radius} ${radius}
         A ${radius} ${radius} 0 1 0 ${radius + radius} ${radius}
         M ${radius + innerRadius} ${radius}
         A ${innerRadius} ${innerRadius} 0 1 1 ${radius - innerRadius} ${radius}
         A ${innerRadius} ${innerRadius} 0 1 1 ${radius + innerRadius} ${radius} Z`
      : `M ${x1} ${y1}
         A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
         L ${x3} ${y3}
         A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
         Z`;

    return {
      ...d,
      color,
      fraction,
      pathData,
      percent: Math.round(fraction * 100),
    };
  });

  const toggleHide = (key) => {
    setHiddenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className={cn('flex flex-col items-center select-none', className)}>
      {/* SVG Donut Circle */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          {slices.map((slice) => {
            const isActive = activeKey === slice.key;
            const isAnyActive = activeKey !== null;
            return (
              <path
                key={slice.key}
                d={slice.pathData}
                fill={slice.color}
                className="transition-all duration-300 cursor-pointer origin-center"
                style={{
                  opacity: isAnyActive ? (isActive ? 1 : 0.35) : 0.92,
                  transform: isActive ? 'scale(1.04)' : 'scale(1)',
                  transformOrigin: `${radius}px ${radius}px`,
                  filter: isActive ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))' : 'none',
                }}
                onMouseEnter={() => setActiveKey(slice.key)}
                onMouseLeave={() => setActiveKey(null)}
              />
            );
          })}
        </svg>

        {/* Center Rolling Readout */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-200"
          style={{ width: innerRadius * 2, height: innerRadius * 2, margin: 'auto' }}
        >
          {activeItem ? (
            <div className="animate-in fade-in zoom-in-95 duration-150 px-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500 line-clamp-1">
                {activeItem.label}
              </span>
              <div className="text-xl font-bold font-mono text-neutral-900 dark:text-white leading-tight">
                {formatValue(activeItem.value)}
              </div>
              <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                {total > 0 ? Math.round((activeItem.value / total) * 100) : 0}% of traffic
              </div>
            </div>
          ) : (
            <div className="px-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {totalLabel}
              </span>
              <div className="text-xl font-bold font-mono text-neutral-900 dark:text-white leading-tight">
                {formatValue(total)}
              </div>
              <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                {unit}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Synced Legend Pills */}
      <div className="w-full mt-4 flex flex-wrap items-center justify-center gap-2">
        {data.map((item, idx) => {
          const isHidden = hiddenKeys.includes(item.key);
          const isActive = activeKey === item.key;
          const slice = slices.find((s) => s.key === item.key);
          const percent = slice ? slice.percent : 0;
          const color = item.color || defaultColors[idx % defaultColors.length];

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleHide(item.key)}
              onMouseEnter={() => !isHidden && setActiveKey(item.key)}
              onMouseLeave={() => setActiveKey(null)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono transition-all border cursor-pointer',
                isHidden
                  ? 'opacity-40 line-through bg-neutral-100 dark:bg-white/5 border-transparent text-neutral-400'
                  : isActive
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent shadow-xs scale-105'
                  : 'bg-white/80 dark:bg-[#1E1E1E]/80 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-white/10 hover:border-neutral-400'
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium truncate max-w-[90px]">{item.label}</span>
              {!isHidden && (
                <span className="text-[10px] opacity-75 font-bold">
                  {percent}%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
