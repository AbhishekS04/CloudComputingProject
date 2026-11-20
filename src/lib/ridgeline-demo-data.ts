/**
 * Seeded deterministic distributions for Ridgeline Demo
 * Matches reference screenshots: Zurich, 2025 | Lisbon, 2025 | Denver, 2025
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Simple pseudorandom number generator for stable reproduction
function pseudoRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate normal distribution samples using Box-Muller transform
function generateSamples(mean: number, std: number, count = 35, seed = 42): number[] {
  const rand = pseudoRandom(seed);
  const samples: number[] = [];
  for (let i = 0; i < count; i += 2) {
    const u1 = Math.max(1e-6, rand());
    const u2 = rand();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    samples.push(Math.round((mean + z0 * std) * 10) / 10);
    if (samples.length < count) {
      samples.push(Math.round((mean + z1 * std) * 10) / 10);
    }
  }
  return samples;
}

export interface CityRidgelineDataset {
  city: string;
  year: number;
  series: { id: string; label: string; values: number[] }[];
}

// Temperature parameters [mean, std] for each month in Zurich
const ZURICH_PARAMS = [
  [3.2, 4.2], [5.8, 4.4], [10.5, 4.6], [14.8, 5.0], [19.2, 5.2], [23.5, 4.6],
  [25.2, 4.2], [24.1, 4.4], [19.8, 4.5], [14.2, 4.4], [8.1, 4.0], [4.1, 3.8]
];

// Temperature parameters for Lisbon (mild winter, hot summer, tighter spread)
const LISBON_PARAMS = [
  [15.2, 2.6], [16.5, 2.8], [18.8, 3.0], [20.2, 3.4], [23.1, 3.6], [26.0, 3.8],
  [28.2, 3.9], [29.1, 3.8], [26.8, 3.4], [22.8, 3.0], [18.2, 2.8], [15.6, 2.6]
];

// Temperature parameters for Denver (continental climate, wide diurnal swing)
const DENVER_PARAMS = [
  [7.2, 6.2], [8.5, 6.4], [13.2, 6.2], [16.8, 5.8], [21.8, 5.6], [28.2, 5.2],
  [32.1, 4.8], [30.6, 5.0], [25.8, 5.8], [18.6, 6.0], [11.2, 6.2], [7.4, 5.8]
];

export const RIDGELINE_CITIES_DATA: Record<string, CityRidgelineDataset> = {
  Zurich: {
    city: 'Zurich',
    year: 2025,
    series: MONTHS.map((month, idx) => ({
      id: `zurich-${month.toLowerCase()}`,
      label: month,
      values: generateSamples(ZURICH_PARAMS[idx][0], ZURICH_PARAMS[idx][1], 38, 100 + idx * 17)
    }))
  },
  Lisbon: {
    city: 'Lisbon',
    year: 2025,
    series: MONTHS.map((month, idx) => ({
      id: `lisbon-${month.toLowerCase()}`,
      label: month,
      values: generateSamples(LISBON_PARAMS[idx][0], LISBON_PARAMS[idx][1], 38, 200 + idx * 19)
    }))
  },
  Denver: {
    city: 'Denver',
    year: 2025,
    series: MONTHS.map((month, idx) => ({
      id: `denver-${month.toLowerCase()}`,
      label: month,
      values: generateSamples(DENVER_PARAMS[idx][0], DENVER_PARAMS[idx][1], 38, 300 + idx * 23)
    }))
  }
};
