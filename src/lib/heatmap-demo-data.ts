import { HeatmapColumn } from "@/components/charts/heatmap";

/**
 * Generates 24 weeks of realistic activity/contribution data
 * for the Heatmap Chart component.
 */
export function getHeatmapDemoData(weeksCount = 28): HeatmapColumn[] {
  const columns: HeatmapColumn[] = [];
  const today = new Date();
  
  // Align to Sunday start
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (weeksCount * 7) + (7 - today.getDay()));

  for (let w = 0; w < weeksCount; w++) {
    const bins = [];
    for (let d = 0; d < 7; d++) {
      const curDate = new Date(startDate);
      curDate.setDate(startDate.getDate() + (w * 7 + d));

      // Business days (Mon-Fri) have higher probability of activity
      const isWeekend = d === 0 || d === 6;
      let count = 0;

      if (!isWeekend) {
        const rand = Math.random();
        if (rand > 0.75) count = 4;
        else if (rand > 0.5) count = 3;
        else if (rand > 0.25) count = 2;
        else if (rand > 0.1) count = 1;
        else count = 0;
      } else {
        count = Math.random() > 0.7 ? 1 : 0;
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

  return columns;
}
