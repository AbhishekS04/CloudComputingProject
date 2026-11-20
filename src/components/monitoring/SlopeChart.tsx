import React, { useState } from 'react';
import { SlopeChart as ArcSlopeChart, type SlopeItem } from '@/components/arc/slope-chart/slope-chart';
import { SLOPE_CHART_REGIONS } from '@/lib/slope-chart-demo-data';

export interface SlopeChartCardProps {
  data?: SlopeItem[];
  label?: string;
  startLabel?: string;
  endLabel?: string;
  height?: number;
  highlightKey?: string | null;
  className?: string;
}

const REGION_KEYS = ['Americas', 'Europe', 'Asia Pacific'] as const;
type RegionKey = typeof REGION_KEYS[number];

/**
 * Interactive Enterprise SlopeChart Card
 * Faithfully reproduces the UI Arc Slope Chart demo from uploaded_media_1795195123381.png
 * Features segmented region dataset switcher, smooth line morphing on change,
 * rank change indicator pills, leader hairlines, and keyboard accessibility.
 */
export default function SlopeChart({
  data: customData,
  label: customLabel,
  startLabel: customStartLabel,
  endLabel: customEndLabel,
  height,
  highlightKey: customHighlightKey,
  className = '',
}: SlopeChartCardProps) {
  const [activeRegion, setActiveRegion] = useState<RegionKey>('Americas');

  // If custom data was explicitly passed, use it; otherwise use the region demo dataset
  const activeDataset = SLOPE_CHART_REGIONS[activeRegion];
  const chartData = customData || activeDataset.items;
  const chartLabel = customLabel || 'Conversion by channel';
  const startLabel = customStartLabel || 'Q1';
  const endLabel = customEndLabel || 'Q2';
  const highlightKey = customHighlightKey !== undefined ? customHighlightKey : activeDataset.highlightKey;

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#14161b]/90 border border-black/[0.06] dark:border-white/[0.08] shadow-xs backdrop-blur-md flex flex-col justify-between font-sans ${className}`}>
      {/* Card Header: Title, Period & Region Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
            {chartLabel}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {activeDataset.period}
          </p>
        </div>

        {/* Dataset Switcher (Americas / Europe / Asia Pacific) */}
        {!customData && (
          <div className="flex items-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] text-xs">
            {REGION_KEYS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setActiveRegion(region)}
                className={`px-3 py-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                  activeRegion === region
                    ? 'bg-white dark:bg-[#202227] text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Official Arc Slope Chart Component */}
      <div className="w-full flex-1 flex flex-col justify-center">
        <ArcSlopeChart
          data={chartData}
          label={chartLabel}
          startLabel={startLabel}
          endLabel={endLabel}
          highlightKey={highlightKey}
          height={height ?? 240}
          formatValue={(val) => `${val.toFixed(1)}%`}
          formatChange={(change, item) => `${item.end >= item.start ? '+' : '−'}${Math.abs(change).toFixed(1)}%`}
        />
      </div>
    </div>
  );
}
