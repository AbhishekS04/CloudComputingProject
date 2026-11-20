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
    <div className={`p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#14161b]/90 border border-black/[0.06] dark:border-white/[0.08] shadow-xs backdrop-blur-md flex flex-col justify-between font-sans ${className}`}>
      {/* Card Header: Title, City/Year & Dataset Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
            {chartLabel}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {activeDataset.city}, {activeDataset.year}
          </p>
        </div>

        {/* Dataset Switcher (Zurich / Lisbon / Denver) */}
        {!customSeries && (
          <div className="flex items-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] text-xs">
            {CITY_KEYS.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setActiveCity(city)}
                className={`px-3 py-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                  activeCity === city
                    ? 'bg-white dark:bg-[#202227] text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium'
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
