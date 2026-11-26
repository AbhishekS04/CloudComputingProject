import React, { useState, useMemo, memo } from 'react';
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
  HEATMAP_DEFAULT_LEVEL_STYLES,
} from "@bklitui/ui/charts";
import { getHeatmapDemoData } from "@/lib/heatmap-demo-data";

interface ContributionHeatmapCardProps {
  className?: string;
}

const TIME_RANGES = ['Day', 'Week', 'Month', 'Quarter', 'Year', 'All'] as const;
type TimeRange = typeof TIME_RANGES[number];

const ContributionHeatmapCard = memo(function ContributionHeatmapCard({
  className = "",
}: ContributionHeatmapCardProps) {
  const [activeRange, setActiveRange] = useState<TimeRange>('Week');

  const weeksCount = useMemo(() => {
    switch (activeRange) {
      case 'Day':
        return 12;
      case 'Week':
        return 24;
      case 'Month':
        return 28;
      case 'Quarter':
        return 32;
      case 'Year':
      case 'All':
        return 36;
      default:
        return 28;
    }
  }, [activeRange]);

  const contributionData = useMemo(() => getHeatmapDemoData(weeksCount), [weeksCount]);

  const metrics = useMemo(() => {
    let totalCount = 0;
    let activeBins = 0;
    let peak = 0;

    contributionData.forEach((col) => {
      col.bins.forEach((b) => {
        if (b.count > 0) {
          totalCount += b.count;
          activeBins++;
        }
        if (b.count > peak) peak = b.count;
      });
    });

    return {
      avg: activeBins > 0 ? (totalCount / activeBins).toFixed(1) : "0",
      totalEvents: totalCount * 1240,
      peak,
    };
  }, [contributionData]);

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col justify-between font-sans ${className}`}
    >
      <div>
        {/* Header: Title, Summary & Range Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-black/[0.05] dark:border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Cluster Activity Heatmap
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Diurnal request density across {weeksCount} weeks ·{' '}
              <span className="font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                {metrics.totalEvents.toLocaleString()}
              </span>{' '}
              indexed
            </p>
          </div>

          <div className="flex items-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] text-xs">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setActiveRange(range)}
                className={`px-3 py-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                  activeRange === range
                    ? "bg-white dark:bg-[#202227] text-neutral-900 dark:text-white shadow-xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Typographic Metric Strip (replaces 3 redundant bordered mini-cards) */}
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 my-4">
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Off-peak floor</span>
            <div className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white tabular-nums mt-0.5">
              97 <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">req/s</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Sustained mean</span>
            <div className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white tabular-nums mt-0.5">
              270 <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">req/s</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Burst ceiling</span>
            <div className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white tabular-nums mt-0.5">
              408 <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">req/s</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="mt-1 w-full py-1">
          <HeatmapInteractionProvider>
            <HeatmapInteractionBoundary>
              <div className="flex w-full flex-col items-stretch gap-3">
                <HeatmapChart
                  className="w-full"
                  data={contributionData}
                  layout="fluid"
                >
                  <HeatmapCells
                    inactiveOpacity={0.3}
                    inactiveScale={1}
                    activeScale={1.15}
                  />
                  <HeatmapXAxis />
                  <HeatmapYAxis tickFilter="odd" />
                  <HeatmapTooltip />
                </HeatmapChart>
              </div>
            </HeatmapInteractionBoundary>
          </HeatmapInteractionProvider>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400 dark:text-neutral-500 mt-3">
        <span>Avg intensity {metrics.avg} / 4 · 99.98% coverage</span>
        <HeatmapLegend
          lessLabel="Less"
          moreLabel="More"
          cellSize={10}
          gap={3}
          levelStyles={HEATMAP_DEFAULT_LEVEL_STYLES}
        />
      </div>
    </div>
  );
});

export default ContributionHeatmapCard;
