import type { LineChartDatum, LineChartSeries } from "@/components/arc/line-chart/line-chart";

export interface LineChartRangeDataset {
  label: string;
  headlineValue: number;
  headlineUnit: string;
  subValue: string;
  deltaText: string;
  deltaPositive: boolean;
  series: LineChartSeries[];
  data: LineChartDatum[];
}

export const TELEMETRY_LINE_CHART_SERIES: LineChartSeries[] = [
  {
    key: "throughput",
    label: "Ingress Throughput (req/s)",
    color: "#3B82F6",
    area: true,
  },
  {
    key: "latency",
    label: "p95 Response Latency (ms)",
    color: "#10B981",
    dashed: true,
  },
];

// Helper to generate diurnal undulating points
function generateTelemetryPoints(count: number, labelPrefix: string, timeStepMinutes: number, baseThroughput = 280, baseLatency = 45): LineChartDatum[] {
  const points: LineChartDatum[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const minutesAgo = (count - 1 - i) * timeStepMinutes;
    const ptDate = new Date(now.getTime() - minutesAgo * 60 * 1000);
    const timeStr = ptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const hourMinute = ptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Undulating sine waves with periodic bursts matching screenshot
    const wave = Math.sin((i / count) * Math.PI * 4);
    const spike = (i % 7 === 2) ? 1.45 : (i % 7 === 5) ? 1.3 : 1.0;
    const throughput = Math.round(Math.max(50, (baseThroughput + wave * 90) * spike + (Math.sin(i * 1.5) * 20)));
    const latency = Math.round(Math.max(18, baseLatency + Math.cos((i / count) * Math.PI * 6) * 14 + (Math.sin(i) * 3)));

    const isTick = i % Math.max(1, Math.floor(count / 5)) === 0 || i === count - 1;

    points.push({
      key: `pt-${i}-${timeStr}`,
      label: `${timeStr} (${throughput} req/s, ${latency}ms)`,
      axisLabel: isTick ? hourMinute : undefined,
      values: {
        throughput,
        latency,
      },
    });
  }

  return points;
}

export const TELEMETRY_RANGES_DATA: Record<string, LineChartRangeDataset> = {
  "15m": {
    label: "15m",
    headlineValue: 312,
    headlineUnit: "req/s",
    subValue: "48ms p95",
    deltaText: "+14.2% vs previous 15m",
    deltaPositive: true,
    series: TELEMETRY_LINE_CHART_SERIES,
    data: generateTelemetryPoints(16, "15m", 1, 290, 48),
  },
  "1h": {
    label: "1h",
    headlineValue: 285,
    headlineUnit: "req/s",
    subValue: "50ms p95",
    deltaText: "+8.6% vs previous hour",
    deltaPositive: true,
    series: TELEMETRY_LINE_CHART_SERIES,
    data: generateTelemetryPoints(24, "1h", 2.5, 280, 50),
  },
  "24h": {
    label: "24h",
    headlineValue: 300,
    headlineUnit: "req/s",
    subValue: "52ms p95",
    deltaText: "+20.6% vs previous 24h",
    deltaPositive: true,
    series: TELEMETRY_LINE_CHART_SERIES,
    data: generateTelemetryPoints(28, "24h", 50, 300, 52),
  },
  "7d": {
    label: "7d",
    headlineValue: 274,
    headlineUnit: "req/s",
    subValue: "55ms p95",
    deltaText: "-3.4ms SLA improvement",
    deltaPositive: true,
    series: TELEMETRY_LINE_CHART_SERIES,
    data: generateTelemetryPoints(32, "7d", 300, 270, 54),
  },
};
