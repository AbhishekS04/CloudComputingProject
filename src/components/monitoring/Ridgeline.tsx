import React, { useState, memo } from 'react';
import { Ridgeline as ArcRidgeline, type RidgelineSeries } from '@/components/arc/ridgeline/ridgeline';
import { RIDGELINE_SERVERS_DATA } from '@/lib/ridgeline-demo-data';

export interface RidgelineCardProps {
  series?: RidgelineSeries[];
  label?: string;
  unit?: string;
  domain?: [number, number];
  height?: number;
  className?: string;
}

const SERVER_KEYS = ['vm-backend-01', 'vm-backend-02', 'vm-backend-03'] as const;
type ServerKey = typeof SERVER_KEYS[number];

/**
 * Interactive Enterprise Ridgeline (Joy Plot) Card
 * Displays continuous Gaussian response latency distributions (ms) across diurnal hours
 * for each backend Azure VM in the cluster.
 */
const Ridgeline = memo(function Ridgeline({
  series: customSeries,
  label: customLabel,
  unit: customUnit,
  domain: customDomain,
  className = '',
}: RidgelineCardProps) {
  const [activeServer, setActiveServer] = useState<ServerKey>('vm-backend-01');

  const activeDataset = RIDGELINE_SERVERS_DATA[activeServer] || RIDGELINE_SERVERS_DATA['vm-backend-01'];
  const chartSeries = customSeries || activeDataset.series;
  const chartLabel = customLabel || 'P95 Response Latency Distribution';
  const unit = customUnit !== undefined ? customUnit : 'ms';
  const domain = customDomain || ([5, 45] as [number, number]);

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex flex-col justify-between font-sans ${className}`}>
      {/* Card Header: Title, Server IP & Dataset Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
            {chartLabel}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {activeDataset.server} · {activeDataset.ip}
          </p>
        </div>

        {/* Dataset Switcher (vm-backend-01 / vm-backend-02 / vm-backend-03) */}
        {!customSeries && (
          <div className="flex items-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] text-xs">
            {SERVER_KEYS.map((srv) => (
              <button
                key={srv}
                type="button"
                onClick={() => setActiveServer(srv)}
                className={`px-3 py-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                  activeServer === srv
                    ? 'bg-white dark:bg-[#202227] text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium'
                }`}
              >
                {srv}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Official Arc Ridgeline Component */}
      <div className="w-full flex-1 flex flex-col justify-center">
        <ArcRidgeline
          series={chartSeries}
          label={chartLabel}
          unit={unit}
          domain={domain}
          legend={true}
        />
      </div>
    </div>
  );
});

export default Ridgeline;
