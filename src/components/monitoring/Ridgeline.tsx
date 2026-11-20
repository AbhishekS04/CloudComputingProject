import React, { useState } from 'react';
import { Ridgeline as ArcRidgeline, type RidgelineSeries } from '@/components/arc/ridgeline/ridgeline';
import { RIDGELINE_CITIES_DATA } from '@/lib/ridgeline-demo-data';

export interface RidgelineCardProps {
  series?: RidgelineSeries[];
  label?: string;
  unit?: string;
  domain?: [number, number];
  height?: number;
  className?: string;
}

const CITY_KEYS = ['Zurich', 'Lisbon', 'Denver'] as const;
type CityKey = typeof CITY_KEYS[number];

/**
 * Interactive Enterprise Ridgeline (Joy Plot) Card
 * Faithfully reproduces the UI Arc Ridgeline demo from uploaded_media_0_1795196660594.png
 * Features segmented city dataset switcher, smooth kernel density wave reveals and morphs,
 * hover ridge lift with quartile bands, crosshair, and median gradient scale.
 */
export default function Ridgeline({
  series: customSeries,
  label: customLabel,
  unit: customUnit,
  domain: customDomain,
  className = '',
}: RidgelineCardProps) {
  const [activeCity, setActiveCity] = useState<CityKey>('Zurich');

  const activeDataset = RIDGELINE_CITIES_DATA[activeCity];
  const chartSeries = customSeries || activeDataset.series;
  const chartLabel = customLabel || 'Daily highs';
  const unit = customUnit !== undefined ? customUnit : '°';
  const domain = customDomain || ([-10, 40] as [number, number]);

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#1A1A1A]/90 border border-neutral-200/80 dark:border-white/10 shadow-xs backdrop-blur-md flex flex-col justify-between ${className}`}>
      {/* Card Header: Title, City/Year & Dataset Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-200/80 dark:border-white/10">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
            {chartLabel}
          </h3>
          <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
            {activeDataset.city}, {activeDataset.year}
          </p>
        </div>

        {/* Dataset Switcher (Zurich / Lisbon / Denver) */}
        {!customSeries && (
          <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 text-xs font-mono font-medium">
            {CITY_KEYS.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setActiveCity(city)}
                className={`px-3 py-1 rounded-[6px] transition-all cursor-pointer ${
                  activeCity === city
                    ? 'bg-white dark:bg-[#2A2A2A] text-neutral-900 dark:text-white shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Official Arc Ridgeline Component */}
      <div className="w-full flex-1 flex flex-col justify-center">
        <ArcRidgeline
          series={chartSeries}
          label={`${chartLabel} in ${activeCity}`}
          unit={unit}
          domain={domain}
          overlap={2.3}
          rowHeight={22}
          tint={true}
          formatValue={(val) => `${Math.round(val)}${unit}`}
        />
      </div>
    </div>
  );
}
