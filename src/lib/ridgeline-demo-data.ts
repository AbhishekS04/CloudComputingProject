/**
 * Deterministic Gaussian Latency Distributions for the 3 Azure Backend VMs
 * Models real-world P95 server response times (ms) across 12 diurnal monitoring windows
 */

const TIME_WINDOWS = [
  '00:00', '02:00', '04:00', '06:00', '08:00', '10:00',
  '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'
];

function pseudoRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate latency samples in ms using Box-Muller transform
function generateSamples(mean: number, std: number, count = 35, seed = 42): number[] {
  const rand = pseudoRandom(seed);
  const samples: number[] = [];
  for (let i = 0; i < count; i += 2) {
    const u1 = Math.max(1e-6, rand());
    const u2 = rand();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    samples.push(Math.round(Math.max(5, mean + z0 * std) * 10) / 10);
    if (samples.length < count) {
      samples.push(Math.round(Math.max(5, mean + z1 * std) * 10) / 10);
    }
  }
  return samples;
}

export interface ServerRidgelineDataset {
  server: string;
  ip: string;
  period: string;
  series: { id: string; label: string; values: number[] }[];
}

// Latency parameters [mean (ms), std (ms)] across diurnal hours for vm-backend-01
const VM01_PARAMS = [
  [18.2, 2.5], [17.5, 2.2], [16.8, 2.0], [18.0, 2.4], [21.5, 3.2], [24.0, 3.8],
  [26.2, 4.0], [25.8, 3.9], [24.5, 3.5], [22.8, 3.1], [20.5, 2.8], [19.0, 2.6]
];

// Latency parameters for vm-backend-02 (moderate capacity)
const VM02_PARAMS = [
  [22.4, 3.0], [21.0, 2.8], [20.2, 2.5], [22.0, 3.0], [26.5, 4.2], [29.8, 4.8],
  [31.2, 5.0], [30.5, 4.8], [28.6, 4.2], [26.0, 3.8], [24.2, 3.4], [23.0, 3.1]
];

// Latency parameters for vm-backend-03 (high capacity)
const VM03_PARAMS = [
  [15.8, 2.0], [15.2, 1.8], [14.6, 1.6], [16.2, 2.2], [19.0, 2.8], [21.5, 3.2],
  [22.8, 3.5], [22.4, 3.4], [20.8, 3.0], [18.9, 2.6], [17.4, 2.2], [16.2, 2.0]
];

export const RIDGELINE_SERVERS_DATA: Record<string, ServerRidgelineDataset> = {
  "vm-backend-01": {
    server: 'vm-backend-01',
    ip: '10.0.1.10:8081',
    period: '24-Hour Latency Density',
    series: TIME_WINDOWS.map((time, i) => ({
      id: time,
      label: time,
      values: generateSamples(VM01_PARAMS[i][0], VM01_PARAMS[i][1], 35, 101 + i * 7)
    }))
  },
  "vm-backend-02": {
    server: 'vm-backend-02',
    ip: '10.0.1.11:8082',
    period: '24-Hour Latency Density',
    series: TIME_WINDOWS.map((time, i) => ({
      id: time,
      label: time,
      values: generateSamples(VM02_PARAMS[i][0], VM02_PARAMS[i][1], 35, 201 + i * 7)
    }))
  },
  "vm-backend-03": {
    server: 'vm-backend-03',
    ip: '10.0.1.12:8083',
    period: '24-Hour Latency Density',
    series: TIME_WINDOWS.map((time, i) => ({
      id: time,
      label: time,
      values: generateSamples(VM03_PARAMS[i][0], VM03_PARAMS[i][1], 35, 301 + i * 7)
    }))
  }
};
