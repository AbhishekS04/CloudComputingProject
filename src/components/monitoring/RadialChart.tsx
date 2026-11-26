import React, { useState, useEffect, memo } from 'react';
import {
  RadialAxis,
  RadialCenter,
  RadialChart,
  RadialDotBar,
  RadialLegend,
  RadialScrubber,
} from "@bklitui/ui/charts";

const series = [
  { dataKey: "delivered", label: "Delivered (req/s)", color: "var(--chart-4)" },
  { dataKey: "queued", label: "Queued / Retried", color: "var(--chart-2)" },
  { dataKey: "burst", label: "Burst Overhead", color: "var(--chart-1)", emphasize: true },
];

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

    const hourFloat = hours + minutes / 60;
    const diurnalCurve = Math.max(0.15, 0.45 + 0.55 * Math.sin(((hourFloat - 6) / 24) * Math.PI * 2));
    const yesterday = Math.round(180 + diurnalCurve * 140 + (Math.sin(i * 0.4) * 20));

    if (i <= nowBinIndex) {
      const delivered = Math.round(190 + diurnalCurve * 160 + (Math.cos(i * 0.3) * 18));
      const queued = Math.round(8 + diurnalCurve * 12 + ((i % 4) * 2));
      const burst = Math.round(15 + diurnalCurve * 25 + ((i % 3) * 4));

      bins.push({ time: timeStr, delivered, queued, burst, yesterday });
    } else {
      bins.push({ time: timeStr, delivered: null, queued: null, burst: null, yesterday });
    }
  }

  return { bins, nowBinIndex };
}

const RadialChartComponent = memo(function RadialChartComponent({
  label = "24-Hour Ingress Cycle",
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
      className={`p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col justify-between font-sans ${className}`}
    >
      <div className="pb-3.5 border-b border-black/[0.05] dark:border-white/[0.06] mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {label}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Today vs yesterday · 15-min bins
          </p>
        </div>
      </div>

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
                      {diff > 0 ? `+${diff}` : diff} vs yesterday
                    </span>
                  </div>
                );
              }

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
                    {restDiff > 0 ? `+${restDiff}` : restDiff} vs yesterday
                  </span>
                </div>
              );
            }}
          </RadialCenter>
          <RadialLegend className="mt-4" />
        </RadialChart>
      </div>

      <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 mt-2">
        <span>96 diurnal intervals</span>
        <span>Hover ring to scrub</span>
      </div>
    </div>
  );
});

export default RadialChartComponent;
