import { HeatmapColumn } from "@/components/charts/heatmap";

const heatmapCache = new Map<number, HeatmapColumn[]>();

function seededRand(seedInit: number) {
  let s = seedInit % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates deterministic weeks of activity/contribution data
 * for the Heatmap Chart component and caches per week count.
 */
export function getHeatmapDemoData(weeksCount = 28): HeatmapColumn[] {
  const cached = heatmapCache.get(weeksCount);
  if (cached) return cached;

  const columns: HeatmapColumn[] = [];
  const today = new Date();
  const startUtcMs = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - weeksCount * 7 + (7 - today.getDay())
  );
  const randNext = seededRand(weeksCount * 1337 + 424242);

  for (let w = 0; w < weeksCount; w++) {
    const bins = [];
    for (let d = 0; d < 7; d++) {
      const curDate = new Date(startUtcMs + (w * 7 + d) * 86400000);

      // Business days (Mon-Fri) have higher probability of activity
      const isWeekend = d === 0 || d === 6;
      let count = 0;
      const rand = randNext();

      if (!isWeekend) {
        if (rand > 0.75) count = 4;
        else if (rand > 0.5) count = 3;
        else if (rand > 0.25) count = 2;
        else if (rand > 0.1) count = 1;
        else count = 0;
      } else {
        count = rand > 0.7 ? 1 : 0;
      }

      bins.push({
        bin: d,
        count,
        date: curDate,
      });
    }

    columns.push({
      bin: w,
      bins,
    });
  }

  heatmapCache.set(weeksCount, columns);
  return columns;
}
