import type { SlopeItem } from "@/components/arc/slope-chart/slope-chart";

export interface RegionSlopeDataset {
  region: string;
  period: string;
  highlightKey: string;
  items: SlopeItem[];
}

export const SLOPE_CHART_REGIONS: Record<string, RegionSlopeDataset> = {
  Americas: {
    region: 'Americas',
    period: 'Q1 to Q2 2026',
    highlightKey: 'email',
    items: [
      { key: 'direct', label: 'Direct', start: 3.9, end: 3.7 },
      { key: 'organic', label: 'Organic search', start: 3.4, end: 3.6 },
      { key: 'email', label: 'Email', start: 3.1, end: 4.6 },
      { key: 'paid-search', label: 'Paid search', start: 2.8, end: 2.5 },
      { key: 'referral', label: 'Referral', start: 2.6, end: 3.2 },
      { key: 'social', label: 'Paid social', start: 1.9, end: 1.3 },
    ]
  },
  Europe: {
    region: 'Europe',
    period: 'Q1 to Q2 2026',
    highlightKey: 'email',
    items: [
      { key: 'organic', label: 'Organic search', start: 3.8, end: 4.2 },
      { key: 'direct', label: 'Direct', start: 3.5, end: 3.1 },
      { key: 'email', label: 'Email', start: 2.9, end: 4.0 },
      { key: 'paid-search', label: 'Paid search', start: 3.0, end: 2.7 },
      { key: 'referral', label: 'Referral', start: 2.4, end: 2.9 },
      { key: 'social', label: 'Paid social', start: 1.6, end: 1.2 },
    ]
  },
  "Asia Pacific": {
    region: 'Asia Pacific',
    period: 'Q1 to Q2 2026',
    highlightKey: 'email',
    items: [
      { key: 'direct', label: 'Direct', start: 4.2, end: 3.8 },
      { key: 'email', label: 'Email', start: 2.7, end: 4.4 },
      { key: 'organic', label: 'Organic search', start: 3.0, end: 3.5 },
      { key: 'referral', label: 'Referral', start: 2.8, end: 3.4 },
      { key: 'paid-search', label: 'Paid search', start: 3.3, end: 2.9 },
      { key: 'social', label: 'Paid social', start: 2.1, end: 1.5 },
    ]
  }
};
