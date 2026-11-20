import React, { useState, useMemo } from 'react';
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
import { Activity, ArrowUpRight, Calendar, Sparkles } from "lucide-react";

interface ContributionHeatmapCardProps {
  className?: string;
}

const TIME_RANGES = ['Day', 'Week', 'Month', 'Quarter', 'Year', 'All'] as const;
type TimeRange = typeof TIME_RANGES[number];

/**
 * ContributionHeatmapCard
 * Enterprise Apple Bento analytic card displaying diurnal traffic & contribution density
 * Inspired by Reference Image 4 (Analytic View) with minimal/average/maximum stat chips,
 * range filters, composable Heatmap Chart, and synchronized tooltips & legend.
 */
export default function ContributionHeatmapCard({
  className = "",
}: ContributionHeatmapCardProps) {
  const [activeRange, setActiveRange] = useState<TimeRange>('Week');

  // Generate weeks according to selected range
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

  // Compute summary metrics across data
  const metrics = useMemo(() => {
    let totalCount = 0;
    let max = 0;
    let min = Infinity;
    let activeBins = 0;

    contributionData.forEach((col) => {
      col.bins.forEach((b) => {
        if (b.count > 0) {
          totalCount += b.count;
          activeBins++;
        }
        if (b.count > max) max = b.count;
        if (b.count < min) min = b.count;
      });
    });

    const avg = activeBins > 0 ? (totalCount / activeBins).toFixed(1) : "0";
    return {
      min: min === Infinity ? 0 : min,
      avg,
      max,
      totalEvents: totalCount * 1240, // Scaled for enterprise cluster
    };
  }, [contributionData]);

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#1A1A1A]/90 border border-neutral-200/80 dark:border-white/10 shadow-xs backdrop-blur-md flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Top Header: Title, Description & Range Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200/80 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Analytic View · Cluster Activity Heatmap
              </h3>
            </div>
            <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5">
              Ingress request density & diurnal traffic distribution across {weeksCount} weeks
            </p>
          </div>

          {/* Range Pills (Inspired by Reference Image 4) */}
          <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 text-[11px] font-mono font-medium">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setActiveRange(range)}
                className={`px-2.5 py-0.5 rounded-[5px] transition-all cursor-pointer ${
                  activeRange === range
                    ? "bg-white dark:bg-[#2A2A2A] text-neutral-900 dark:text-white shadow-2xs font-bold"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Metric Summary Readouts (Minimal, Average, Maximum) */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3 rounded-xl bg-neutral-50/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                Minimal Ingress
              </span>
              <ArrowUpRight className="w-3 h-3 text-neutral-400" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-neutral-800 dark:text-neutral-100">
                97
              </span>
              <span className="text-[10px] font-mono text-neutral-400">req/s</span>
            </div>
            <p className="text-[10px] font-mono text-neutral-400 mt-0.5">Off-peak baseline</p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                Average Rate
              </span>
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-neutral-800 dark:text-neutral-100">
                270
              </span>
              <span className="text-[10px] font-mono text-neutral-400">req/s</span>
            </div>
            <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Sustained throughput</p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                Peak Burst
              </span>
              <ArrowUpRight className="w-3 h-3 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-neutral-800 dark:text-neutral-100">
                408
              </span>
              <span className="text-[10px] font-mono text-neutral-400">req/s</span>
            </div>
            <p className="text-[10px] font-mono text-neutral-400 mt-0.5">Spike capacity</p>
          </div>
        </div>

        {/* Heatmap Composable Architecture */}
        <div className="mt-2 w-full py-1">
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

      {/* Footer: Total Stats and Legend */}
      <div className="pt-3 border-t border-neutral-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono mt-3">
        <span className="text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {metrics.totalEvents.toLocaleString()} cluster requests indexed · 99.98% coverage
        </span>
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
}
