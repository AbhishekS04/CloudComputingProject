import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  trendDirection = 'up',
  sparklineData = []
}) {
  return (
    <div className="bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl p-4 shadow-subtle flex flex-col justify-between transition-all select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold font-mono text-charcoal-500 dark:text-cream-400 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-800 dark:text-cream-200 flex items-center justify-center shadow-xs">
            <Icon className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="my-2.5">
        <div className="text-2xl font-extrabold text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
          {value}
        </div>
        {subtitle && (
          <div className="text-[11px] text-charcoal-400 mt-0.5 font-sans leading-tight">{subtitle}</div>
        )}
      </div>

      {/* Bottom Trend & Mini Sparkline */}
      <div className="flex items-center justify-between pt-2 border-t border-[#DDD6C6] dark:border-charcoal-700/60 text-xs">
        {trend !== undefined && (
          <div className="flex items-center gap-1 font-mono text-[10px]">
            {trendDirection === 'up' && (
              <span className="flex items-center text-emerald-600 font-bold">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                {trend}
              </span>
            )}
            {trendDirection === 'down' && (
              <span className="flex items-center text-rose-600 font-bold">
                <TrendingDown className="w-3 h-3 mr-0.5" />
                {trend}
              </span>
            )}
            {trendDirection === 'neutral' && (
              <span className="flex items-center text-charcoal-400 font-bold">
                <Minus className="w-3 h-3 mr-0.5" />
                {trend}
              </span>
            )}
            {trendLabel && (
              <span className="text-charcoal-400 ml-1">{trendLabel}</span>
            )}
          </div>
        )}

        {/* Mini SVG Sparkline */}
        {sparklineData.length > 2 && (
          <div className="w-16 h-4">
            <svg viewBox="0 0 60 20" className="w-full h-full overflow-visible">
              {(() => {
                const max = Math.max(...sparklineData, 1);
                const min = Math.min(...sparklineData, 0);
                const range = max - min || 1;
                const points = sparklineData
                  .map((val, idx) => {
                    const x = (idx / (sparklineData.length - 1)) * 60;
                    const y = 20 - ((val - min) / range) * 16;
                    return `${x},${y}`;
                  })
                  .join(' ');
                return (
                  <polyline
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />
                );
              })()}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
