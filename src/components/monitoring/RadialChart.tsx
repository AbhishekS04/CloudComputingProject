import React, { useMemo, useState, useEffect } from 'react';
import {
  RadialAxis,
  RadialCenter,
  RadialChart,
  RadialDotBar,
  RadialLegend,
  RadialScrubber,
} from "@bklitui/ui/charts";
import { Clock, Radio, RotateCcw } from 'lucide-react';

const series = [
  { dataKey: "delivered", label: "Delivered (req/s)", color: "var(--chart-4)" },
  { dataKey: "queued", label: "Queued / Retried", color: "var(--chart-2)" },
  { dataKey: "burst", label: "Burst Overhead", color: "var(--chart-1)", emphasize: true },
];

/**
 * Generates 96 × 15-minute bins for the 24-hour diurnal cycle (00:00 to 23:45).
 * Models real-world ingress traffic arriving at the Azure Load Balancer VM
 * across daytime peaks and nighttime troughs.
 */
function generateRadialChartData() {
  const bins = [];
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const nowBinIndex = Math.min(Math.floor(currentTotalMinutes / 15), 95);

  for (let i = 0; i < 96; i++) {
    const totalMinutes = i * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Realistic diurnal activity curve
    const hourFloat = hours + minutes / 60;
    const diurnalCurve = Math.max(0.15, 0.45 + 0.55 * Math.sin(((hourFloat - 6) / 24) * Math.PI * 2));

    // Yesterday comparison baseline
    const yesterday = Math.round(180 + diurnalCurve * 140 + (Math.sin(i * 0.4) * 20));

    if (i <= nowBinIndex) {
      const delivered = Math.round(190 + diurnalCurve * 160 + (Math.cos(i * 0.3) * 18));
      const queued = Math.round(8 + diurnalCurve * 12 + ((i % 4) * 2));
      const burst = Math.round(15 + diurnalCurve * 25 + ((i % 3) * 4));

      bins.push({
        time: timeStr,
        delivered,
        queued,
        burst,
        yesterday,
      });
    } else {
      // Future bins after "now" have null for active series, ghost dots for yesterday
      bins.push({
        time: timeStr,
        delivered: null,
        queued: null,
        burst: null,
        yesterday,
      });
    }
  }

  return { bins, nowBinIndex };
}

export default function RadialChartComponent({
  label = "24-Hour Diurnal Ingress Cycle",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const [{ bins, nowBinIndex }, setChartState] = useState(() => generateRadialChartData());

  useEffect(() => {
    const timer = setInterval(() => {
      setChartState(generateRadialChartData());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const activeBin = bins[nowBinIndex] || bins[0];

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#14161b]/90 border border-black/[0.06] dark:border-white/[0.08] shadow-xs backdrop-blur-md flex flex-col justify-between font-sans ${className}`}
    >
      {/* Apple Bento Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.06] mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {label}
          </h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center gap-1.5">
          <Radio className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />
          Azure LB Clock
        </span>
      </div>

      {/* Composable Bklit Radial Chart Suite */}
      <div className="flex-1 flex items-center justify-center w-full py-2">
        <RadialChart
          data={bins}
          xDataKey="time"
          series={series}
          angleType="clock"
          maxWidth={460}
          className="w-full flex flex-col items-center justify-center"
        >
          <RadialAxis />
          <RadialDotBar
            ghostDataKey="yesterday"
            ghostOpacity={0.25}
            rows={14}
            dotSize={0.48}
          />
          <RadialScrubber showDot variant="solid" color="var(--chart-4)" />
          <RadialCenter>
            {({ datum, label: hoverLabel }) => {
              if (datum) {
                const delivered = (datum.delivered as number) ?? 0;
                const queued = (datum.queued as number) ?? 0;
                const burst = (datum.burst as number) ?? 0;
                const total = delivered + queued + burst;
                const yesterday = (datum.yesterday as number) ?? 0;
                const diff = total - yesterday;

                return (
                  <div className="flex flex-col items-center justify-center text-center select-none">
                    <span className="text-3xl sm:text-4xl font-semibold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                      {total.toLocaleString()}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      req/s at {hoverLabel || (datum.time as string)}
                    </span>
                    <span
                      className={`text-xs font-medium mt-0.5 ${
                        diff >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {diff > 0 ? `+${diff}` : diff} req/s vs yesterday
                    </span>
                  </div>
                );
              }

              // At rest default display
              const restDelivered = (activeBin?.delivered as number) ?? 240;
              const restYesterday = (activeBin?.yesterday as number) ?? 210;
              const restDiff = restDelivered - restYesterday;

              return (
                <div className="flex flex-col items-center justify-center text-center select-none">
                  <span className="text-3xl sm:text-4xl font-semibold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                    {restDelivered}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    req/s at {activeBin?.time || "12:00"}
                  </span>
                  <span
                    className={`text-xs font-medium mt-0.5 ${
                      restDiff >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {restDiff > 0 ? `+${restDiff}` : restDiff} req/s vs yesterday
                  </span>
                </div>
              );
            }}
          </RadialCenter>
          <RadialLegend className="mt-4" />
        </RadialChart>
      </div>

      {/* Footer System Status */}
      <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 mt-2">
        <span>Diurnal Ingress · 96 Bins (15-min)</span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <RotateCcw className="w-3 h-3" />
          LB Gateway Synced
        </span>
      </div>
    </div>
  );
}
