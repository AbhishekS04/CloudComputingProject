import React, { useState, useMemo, memo } from 'react';
import { LineChart as ArcLineChart, type LineChartDatum, type LineChartSeries } from '@/components/arc/line-chart/line-chart';
import { TELEMETRY_RANGES_DATA, TELEMETRY_LINE_CHART_SERIES } from '@/lib/line-chart-demo-data';

export interface MultiSeriesLineChartProps {
  data?: any[];
  series?: any[];
  title?: string;
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  height?: number;
  className?: string;
}

const TIMEFRAMES = ['15m', '1h', '24h', '7d'] as const;
type TimeframeKey = typeof TIMEFRAMES[number];

/**
 * Enterprise Multi-Series Telemetry Line Chart
 * Powered by UI Arc LineChart (@uiarc/line-chart)
 * Features:
 * - Scrubbable gliding crosshair with live headline readout
 * - Smooth spring data morphing between time ranges (15m, 1h, 24h, 7d)
 * - Legend toggles to show/hide throughput or latency series
 * - Solid primary line with area fill and dashed secondary line
 * - Responsive ResizeObserver and WCAG accessibility
 */
const MultiSeriesLineChart = memo(function MultiSeriesLineChart({
  data: customData,
  series: customSeries,
  title = 'REAL-TIME INGRESS THROUGHPUT & RESPONSE LATENCY',
  timeframe: controlledTimeframe,
  onTimeframeChange,
  height = 230,
  className = '',
}: MultiSeriesLineChartProps) {
  const [internalTimeframe, setInternalTimeframe] = useState<TimeframeKey>('24h');
  const activeTimeframe = (controlledTimeframe as TimeframeKey) || internalTimeframe;

  // Active scrubbed datum (driven by crosshair)
  const [scrubbedDatum, setScrubbedDatum] = useState<LineChartDatum | null>(null);

  const rangeDataset = TELEMETRY_RANGES_DATA[activeTimeframe] || TELEMETRY_RANGES_DATA['24h'];

  // Convert custom data if provided, or use range dataset
  const chartData: LineChartDatum[] = useMemo(() => {
    if (customData && customData.length > 0) {
      return customData.map((d, i) => ({
        key: `custom-${i}-${d.time || i}`,
        label: `${d.time || ''} (${Math.round(d.rps || 0)} req/s, ${Math.round(d.latency || 0)}ms)`,
        axisLabel: i % Math.max(1, Math.floor(customData.length / 5)) === 0 ? d.time : undefined,
        values: {
          throughput: Math.round(d.rps || 0),
          latency: Math.round(d.latency || 0),
        },
      }));
    }
    return rangeDataset.data;
  }, [customData, rangeDataset]);

  const chartSeries: LineChartSeries[] = useMemo(() => {
    if (customSeries && customSeries.length > 0) {
      return customSeries.map((s, idx) => ({
        key: s.key === 'rps' ? 'throughput' : s.key,
        label: s.label,
        color: s.color,
        dashed: s.isSecondary || s.dashed,
        area: s.isPrimary || (idx === 0 && !s.dashed),
      }));
    }
    return rangeDataset.series || TELEMETRY_LINE_CHART_SERIES;
  }, [customSeries, rangeDataset]);

  // Current headline values: either from scrubbed point or the latest point
  const latestDatum = chartData[chartData.length - 1];
  const activeDatum = scrubbedDatum || latestDatum;
  const currentThroughput = activeDatum?.values?.throughput ?? rangeDataset.headlineValue;
  const currentLatency = activeDatum?.values?.latency ?? 52;

  const handleTimeframeSelect = (tf: TimeframeKey) => {
    setInternalTimeframe(tf);
    setScrubbedDatum(null);
    onTimeframeChange?.(tf);
  };

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col justify-between font-sans ${className}`}>
      {/* Top Header: Title, Metric Readout & Timeframe Segmented Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3 pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Real-Time Ingress Throughput & Response Latency
          </h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-white tabular-nums tracking-tight">
              {currentThroughput.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              req/s
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-1.5 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {currentLatency}ms p95
            </span>
          </div>
        </div>

        {/* Timeframe Range Switcher (15m, 1h, 24h, 7d) */}
        <div className="flex items-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] text-xs">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => handleTimeframeSelect(tf)}
              className={`px-3 py-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                activeTimeframe === tf
                  ? 'bg-white dark:bg-[#202227] text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Official Arc Line Chart Suite */}
      <div className="w-full flex-1 flex flex-col justify-center">
        <ArcLineChart
          data={chartData}
          series={chartSeries}
          label={title}
          height={height}
          curve="smooth"
          legend={true}
          onActiveChange={(_, datum) => setScrubbedDatum(datum)}
          formatValue={(val, line) => {
            if (line.key === 'latency') return `${Math.round(val)} ms`;
            return `${Math.round(val).toLocaleString()} req/s`;
          }}
          formatTick={(val) => {
            if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
            return `${Math.round(val)}`;
          }}
        />
      </div>
    </div>
  );
});

export default MultiSeriesLineChart;
