import type { SlopeItem } from "@/components/arc/slope-chart/slope-chart";

export interface RegionSlopeDataset {
  region: string;
  period: string;
  highlightKey: string;
  items: SlopeItem[];
}

export const SLOPE_CHART_REGIONS: Record<string, RegionSlopeDataset> = {
  "Round Robin": {
    region: 'Round Robin',
    period: 'Raw Ingress vs Balanced Distribution',
    highlightKey: 'vm-01',
    items: [
      { key: 'vm-01', label: 'vm-backend-01 (10.0.1.10)', start: 51.4, end: 33.3 },
      { key: 'vm-02', label: 'vm-backend-02 (10.0.1.11)', start: 16.2, end: 33.4 },
      { key: 'vm-03', label: 'vm-backend-03 (10.0.1.12)', start: 32.4, end: 33.3 },
    ]
  },
  "Least Connections": {
    region: 'Least Connections',
    period: 'Connection Drain vs Equalized Load',
    highlightKey: 'vm-02',
    items: [
      { key: 'vm-01', label: 'vm-backend-01 (10.0.1.10)', start: 48.0, end: 31.0 },
      { key: 'vm-02', label: 'vm-backend-02 (10.0.1.11)', start: 14.5, end: 35.0 },
      { key: 'vm-03', label: 'vm-backend-03 (10.0.1.12)', start: 37.5, end: 34.0 },
    ]
  },
  "Weighted RR": {
    region: 'Weighted RR',
    period: 'VM SKU Capacity Ratio (3:2:1)',
    highlightKey: 'vm-01',
    items: [
      { key: 'vm-01', label: 'vm-backend-01 (8 Cores)', start: 33.3, end: 50.0 },
      { key: 'vm-02', label: 'vm-backend-02 (4 Cores)', start: 33.3, end: 33.3 },
      { key: 'vm-03', label: 'vm-backend-03 (2 Cores)', start: 33.4, end: 16.7 },
    ]
  }
};
