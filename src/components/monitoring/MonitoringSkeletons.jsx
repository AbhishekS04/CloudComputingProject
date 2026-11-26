import React from 'react';
import { SkeletonBox } from 'skullet/react';

const CARD_SURFACE_CLASS =
  'flex-1 flex flex-col justify-between rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] shadow-xs font-sans';

const PILL_GROUP_CLASS =
  'flex items-center gap-1 p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] shrink-0';

function PillSwitcherSkeleton({ widths }) {
  return (
    <div className={PILL_GROUP_CLASS}>
      {widths.map((w, idx) => (
        <SkeletonBox key={idx} width={w} height={20} radius={999} />
      ))}
    </div>
  );
}

/**
 * Mirrors StatCard (src/components/ui/stat-card.tsx):
 * header + delta pill -> large metric -> subtitle -> full-bleed bottom 52px sparkline.
 */
export function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] pt-5 overflow-hidden shadow-xs">
      <div className="px-5 flex items-center justify-between gap-2">
        <SkeletonBox width={116} height={11} radius={4} />
        <SkeletonBox width={54} height={20} radius={999} />
      </div>

      <div className="mt-2.5 px-5">
        <SkeletonBox width="52%" height={28} radius={7} />
      </div>

      <div className="mt-1.5 px-5">
        <SkeletonBox width="78%" height={12} radius={4} />
      </div>

      {/* Edge-to-edge bottom sparkline band matching StatCard's 52px SVG plot */}
      <div className="mt-3 h-[52px] w-full relative overflow-hidden">
        <svg
          viewBox="0 0 280 52"
          preserveAspectRatio="none"
          className="w-full h-full block"
          aria-hidden="true"
        >
          <path
            d="M0 40 C 38 38, 52 24, 88 28 C 122 32, 138 14, 174 18 C 210 22, 232 10, 280 14 L 280 52 L 0 52 Z"
            fill="var(--skullet-base, rgb(128 128 128 / 0.14))"
            opacity="0.55"
          />
          <path
            d="M0 40 C 38 38, 52 24, 88 28 C 122 32, 138 14, 174 18 C 210 22, 232 10, 280 14"
            fill="none"
            stroke="var(--skullet-base, rgb(128 128 128 / 0.28))"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}

const TRAFFIC_STACKS = [
  [12, 10, 6],
  [16, 12, 8],
  [22, 16, 10],
  [18, 14, 8],
  [26, 18, 12],
  [30, 22, 14],
  [24, 16, 10],
  [18, 14, 8],
  [14, 10, 6],
  [20, 14, 10],
  [34, 24, 14],
  [44, 28, 16],
  [38, 26, 16],
  [48, 30, 18],
  [42, 26, 14],
  [36, 24, 14],
  [44, 28, 16],
  [32, 22, 12],
  [26, 18, 10],
  [22, 14, 8],
];

function TrafficSkeletonBody() {
  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <SkeletonBox width={120} height={13} radius={5} />
          <PillSwitcherSkeleton widths={[38, 42]} />
        </div>

        <div className="mb-4">
          <SkeletonBox width={152} height={30} radius={8} />
          <div className="mt-1.5">
            <SkeletonBox width={196} height={12} radius={4} />
          </div>
        </div>
      </div>

      <div className="h-[132px] w-full flex items-end justify-between gap-1 sm:gap-1.5 px-1">
        {TRAFFIC_STACKS.map(([bot, mid, top], idx) => (
          <div
            key={idx}
            className="flex-1 h-full flex flex-col justify-end items-center gap-[2px]"
          >
            <SkeletonBox width="100%" height={top} radius={999} />
            <SkeletonBox width="100%" height={mid} radius={999} />
            <SkeletonBox width="100%" height={bot} radius={999} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 mt-3.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
        {[64, 72, 58, 68].map((w, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <SkeletonBox width={10} height={6} radius={999} />
            <SkeletonBox width={w} height={11} radius={4} />
          </div>
        ))}
      </div>
    </>
  );
}

function GatewaySkeletonBody() {
  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-black/[0.05] dark:border-white/[0.06]">
          <div className="space-y-1.5">
            <SkeletonBox width={172} height={15} radius={5} />
            <SkeletonBox width={224} height={11} radius={4} />
          </div>
          <SkeletonBox width={64} height={22} radius={999} />
        </div>

        <div className="my-4 rounded-xl bg-black/[0.025] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] px-4 py-3 grid grid-cols-3 gap-3">
          {[
            [68, 52],
            [72, 60],
            [64, 48],
          ].map(([labelW, valW], idx) => (
            <div key={idx} className="space-y-1.5">
              <SkeletonBox width={labelW} height={10} radius={4} />
              <SkeletonBox width={valW} height={17} radius={5} />
            </div>
          ))}
        </div>

        <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
          {[148, 136, 162].map((w, idx) => (
            <div key={idx} className="flex items-center justify-between py-2.5">
              <SkeletonBox width={w} height={12} radius={4} />
              <SkeletonBox width={56} height={12} radius={4} />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between mt-3">
        <SkeletonBox width={170} height={11} radius={4} />
        <SkeletonBox width={108} height={11} radius={4} />
      </div>
    </>
  );
}

function LineSkeletonBody() {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3 pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div>
          <SkeletonBox width={196} height={14} radius={5} />
          <div className="mt-2 flex items-center gap-2.5">
            <SkeletonBox width={94} height={24} radius={7} />
            <SkeletonBox width={66} height={18} radius={999} />
          </div>
        </div>
        <PillSwitcherSkeleton widths={[32, 28, 32, 28]} />
      </div>

      <div className="flex-1 flex flex-col justify-end min-h-[210px] pt-1">
        <div className="flex-1 flex gap-3 items-stretch">
          <div className="flex flex-col justify-between py-2 shrink-0">
            {[28, 24, 28, 22].map((w, idx) => (
              <SkeletonBox key={idx} width={w} height={9} radius={4} />
            ))}
          </div>

          <div className="flex-1 relative flex flex-col justify-between py-2">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="w-full border-t border-dashed border-black/[0.06] dark:border-white/[0.08]"
              />
            ))}
            <svg
              viewBox="0 0 420 150"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              aria-hidden="true"
            >
              <path
                d="M0 112 C 45 104, 70 68, 115 74 C 160 80, 185 36, 235 44 C 280 52, 315 24, 365 30 C 390 34, 405 28, 420 24 L 420 150 L 0 150 Z"
                fill="var(--skullet-base, rgb(128 128 128 / 0.14))"
                opacity="0.4"
              />
              <path
                d="M0 112 C 45 104, 70 68, 115 74 C 160 80, 185 36, 235 44 C 280 52, 315 24, 365 30 C 390 34, 405 28, 420 24"
                fill="none"
                stroke="var(--skullet-base, rgb(128 128 128 / 0.34))"
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0 128 C 52 122, 85 96, 132 100 C 175 104, 210 72, 260 78 C 308 84, 342 58, 420 62"
                fill="none"
                stroke="var(--skullet-base, rgb(128 128 128 / 0.24))"
                strokeWidth="2"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-between pl-10 pt-2">
          {[32, 32, 32, 32, 32].map((w, idx) => (
            <SkeletonBox key={idx} width={w} height={9} radius={4} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-3">
        {[110, 96, 84].map((w, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <SkeletonBox width={14} height={4} radius={999} />
            <SkeletonBox width={w} height={11} radius={4} />
          </div>
        ))}
      </div>
    </>
  );
}

function DonutSkeletonBody() {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <SkeletonBox width={174} height={14} radius={5} />
        <SkeletonBox width={94} height={22} radius={999} />
      </div>

      <div className="flex-1 flex items-center justify-center my-3">
        <div
          className="relative w-[204px] h-[204px] rounded-full flex items-center justify-center"
          style={{
            background:
              'conic-gradient(var(--skullet-base, rgb(128 128 128 / 0.22)) 0deg 132deg, transparent 132deg 138deg, var(--skullet-base, rgb(128 128 128 / 0.16)) 138deg 248deg, transparent 248deg 254deg, var(--skullet-base, rgb(128 128 128 / 0.26)) 254deg 354deg, transparent 354deg 360deg)',
          }}
        >
          <div className="w-[152px] h-[152px] rounded-full bg-white/95 dark:bg-[#14161b]/95 flex flex-col items-center justify-center gap-2">
            <SkeletonBox width={74} height={10} radius={4} />
            <SkeletonBox width={82} height={24} radius={7} />
            <SkeletonBox width={40} height={10} radius={4} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
        {[92, 98, 88, 78].map((w, idx) => (
          <SkeletonBox key={idx} width={w} height={24} radius={999} />
        ))}
      </div>
    </>
  );
}

const HEATMAP_OPACITIES = [0.22, 0.4, 0.65, 0.3, 0.85, 0.5, 0.25];

function HeatmapSkeletonBody() {
  return (
    <>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-black/[0.05] dark:border-white/[0.06]">
          <div className="space-y-1.5">
            <SkeletonBox width={190} height={14} radius={5} />
            <SkeletonBox width={238} height={11} radius={4} />
          </div>
          <PillSwitcherSkeleton widths={[24, 22, 24, 24, 24, 22]} />
        </div>

        <div className="my-4 flex flex-wrap gap-x-8 gap-y-2">
          {[
            [74, 64],
            [82, 70],
            [72, 68],
          ].map(([labelW, valW], idx) => (
            <div key={idx} className="space-y-1.5">
              <SkeletonBox width={labelW} height={10} radius={4} />
              <SkeletonBox width={valW} height={16} radius={5} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-2">
        <div className="space-y-1.5">
          {Array.from({ length: 7 }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-2">
              <SkeletonBox width={22} height={9} radius={3} />
              <div className="flex-1 grid grid-cols-[repeat(18,minmax(0,1fr))] sm:grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
                {Array.from({ length: 24 }).map((__, colIdx) => {
                  const tone = HEATMAP_OPACITIES[(rowIdx * 5 + colIdx * 3) % HEATMAP_OPACITIES.length];
                  return (
                    <div
                      key={colIdx}
                      className={`h-3 rounded-[3px] ${colIdx >= 18 ? 'hidden sm:block' : ''}`}
                      style={{
                        backgroundColor: 'var(--skullet-base, rgb(128 128 128 / 0.2))',
                        opacity: tone,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pl-7 pt-1">
          {[28, 28, 28, 28, 28].map((w, idx) => (
            <SkeletonBox key={idx} width={w} height={9} radius={3} />
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
        <SkeletonBox width={132} height={11} radius={4} />
        <div className="flex items-center gap-1.5">
          <SkeletonBox width={24} height={10} radius={3} />
          {[0.25, 0.45, 0.65, 0.85, 1].map((op, idx) => (
            <div
              key={idx}
              className="w-2.5 h-2.5 rounded-[2px]"
              style={{
                backgroundColor: 'var(--skullet-base, rgb(128 128 128 / 0.22))',
                opacity: op,
              }}
            />
          ))}
          <SkeletonBox width={26} height={10} radius={3} />
        </div>
      </div>
    </>
  );
}

function RadialSkeletonBody() {
  const spokes = Array.from({ length: 24 });
  return (
    <>
      <div className="pb-3.5 border-b border-black/[0.05] dark:border-white/[0.06] mb-3 space-y-1.5">
        <SkeletonBox width={174} height={14} radius={5} />
        <SkeletonBox width={218} height={11} radius={4} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-1">
        <div className="relative w-[198px] h-[198px] flex items-center justify-center">
          {spokes.map((_, idx) => {
            const angle = idx * 15;
            const len = 10 + ((idx * 7) % 14);
            return (
              <div
                key={idx}
                className="absolute inset-0 flex items-start justify-center"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <div
                  className="w-1.5 rounded-full"
                  style={{
                    height: `${len}px`,
                    marginTop: '6px',
                    backgroundColor: 'var(--skullet-base, rgb(128 128 128 / 0.24))',
                    opacity: 0.45 + ((idx % 4) * 0.14),
                  }}
                />
              </div>
            );
          })}
          <div className="flex flex-col items-center justify-center gap-1.5">
            <SkeletonBox width={54} height={10} radius={4} />
            <SkeletonBox width={76} height={24} radius={7} />
            <SkeletonBox width={58} height={10} radius={4} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          {[68, 74, 62].map((w, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <SkeletonBox width={8} height={8} radius={999} />
              <SkeletonBox width={w} height={11} radius={4} />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
        <SkeletonBox width={132} height={11} radius={4} />
        <SkeletonBox width={94} height={11} radius={4} />
      </div>
    </>
  );
}

const RIDGE_PATHS = [
  'M0 30 C 40 28, 70 12, 118 16 C 165 20, 195 6, 245 14 C 295 22, 330 26, 360 30 L 360 32 L 0 32 Z',
  'M0 30 C 35 28, 85 18, 130 10 C 175 4, 210 20, 260 16 C 300 12, 330 24, 360 30 L 360 32 L 0 32 Z',
  'M0 30 C 50 26, 90 10, 145 18 C 190 24, 225 8, 275 12 C 315 16, 338 26, 360 30 L 360 32 L 0 32 Z',
  'M0 30 C 42 26, 80 14, 128 20 C 170 26, 212 6, 258 14 C 305 22, 335 26, 360 30 L 360 32 L 0 32 Z',
  'M0 30 C 48 24, 96 14, 148 12 C 200 10, 240 22, 290 16 C 324 12, 344 24, 360 30 L 360 32 L 0 32 Z',
];

function RidgelineSkeletonBody() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div className="space-y-1.5">
          <SkeletonBox width={212} height={14} radius={5} />
          <SkeletonBox width={180} height={11} radius={4} />
        </div>
        <PillSwitcherSkeleton widths={[46, 46, 46]} />
      </div>

      <div className="flex-1 flex flex-col justify-center gap-2.5 py-2">
        {RIDGE_PATHS.map((d, idx) => (
          <div key={idx} className="flex items-end gap-3">
            <SkeletonBox width={38} height={10} radius={4} />
            <svg
              viewBox="0 0 360 32"
              preserveAspectRatio="none"
              className="flex-1 h-8 block"
              aria-hidden="true"
            >
              <path
                d={d}
                fill="var(--skullet-base, rgb(128 128 128 / 0.16))"
                stroke="var(--skullet-base, rgb(128 128 128 / 0.3))"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pl-12">
        <div className="flex items-center gap-6">
          {[30, 30, 30, 30].map((w, idx) => (
            <SkeletonBox key={idx} width={w} height={9} radius={4} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBox width={58} height={10} radius={4} />
          <SkeletonBox width={58} height={10} radius={4} />
        </div>
      </div>
    </>
  );
}

function StatusBarsSkeletonBody() {
  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <SkeletonBox width={224} height={14} radius={5} />
        <SkeletonBox width={108} height={12} radius={4} />
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3">
        {[58, 62, 54, 60].map((labelW, rowIdx) => (
          <div
            key={rowIdx}
            className="rounded-xl border border-black/[0.04] dark:border-white/[0.05] bg-black/[0.015] dark:bg-white/[0.02] px-3.5 py-2.5"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <SkeletonBox width={`${labelW}%`} height={12} radius={4} />
              <SkeletonBox width={46} height={12} radius={4} />
            </div>
            <div className="flex items-center gap-[3px] h-5">
              {Array.from({ length: 40 }).map((_, barIdx) => (
                <div
                  key={barIdx}
                  className={`flex-1 h-full rounded-[2px] ${barIdx >= 28 ? 'hidden sm:block' : ''}`}
                  style={{
                    backgroundColor: 'var(--skullet-base, rgb(128 128 128 / 0.22))',
                    opacity: barIdx % 17 === 4 ? 0.45 : 0.9,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TableSkeletonBody() {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="space-y-1.5">
          <SkeletonBox width={186} height={15} radius={5} />
          <SkeletonBox width={236} height={11} radius={4} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SkeletonBox width={144} height={28} radius={999} />
          <PillSwitcherSkeleton widths={[28, 40, 42]} />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start">
        <div className="grid grid-cols-12 gap-3 pb-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="col-span-3"><SkeletonBox width={64} height={10} radius={3} /></div>
          <div className="col-span-2 hidden sm:block"><SkeletonBox width={58} height={10} radius={3} /></div>
          <div className="col-span-3 sm:col-span-2"><SkeletonBox width={54} height={10} radius={3} /></div>
          <div className="col-span-2"><SkeletonBox width={44} height={10} radius={3} /></div>
          <div className="col-span-2"><SkeletonBox width={48} height={10} radius={3} /></div>
          <div className="col-span-2 sm:col-span-1 flex justify-end"><SkeletonBox width={36} height={10} radius={3} /></div>
        </div>

        <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
          {[1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-12 gap-3 items-center py-3.5">
              <div className="col-span-3 space-y-1.5">
                <SkeletonBox width="78%" height={12} radius={4} />
                <SkeletonBox width="56%" height={10} radius={4} />
              </div>
              <div className="col-span-2 hidden sm:block">
                <SkeletonBox width="82%" height={11} radius={4} />
              </div>
              <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
                <SkeletonBox width="68%" height={6} radius={999} />
                <SkeletonBox width={26} height={10} radius={4} />
              </div>
              <div className="col-span-2">
                <SkeletonBox width={54} height={11} radius={4} />
              </div>
              <div className="col-span-2">
                <SkeletonBox width={68} height={20} radius={999} />
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                <SkeletonBox width={52} height={22} radius={999} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SlopeSkeletonBody() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div className="space-y-1.5">
          <SkeletonBox width={198} height={14} radius={5} />
          <SkeletonBox width={184} height={11} radius={4} />
        </div>
        <PillSwitcherSkeleton widths={[62, 58, 48]} />
      </div>

      <div className="flex-1 flex flex-col justify-between min-h-[220px] py-1">
        <div className="flex-1 grid grid-cols-[100px_1fr_100px] sm:grid-cols-[130px_1fr_130px] items-center gap-3">
          <div className="space-y-6 flex flex-col items-end">
            {[74, 86, 68, 80].map((w, idx) => (
              <SkeletonBox key={idx} width={w} height={12} radius={4} />
            ))}
          </div>

          <svg
            viewBox="0 0 200 160"
            preserveAspectRatio="none"
            className="w-full h-[156px]"
            aria-hidden="true"
          >
            {[
              [8, 22, 192, 46],
              [8, 60, 192, 24],
              [8, 96, 192, 118],
              [8, 134, 192, 86],
            ].map(([x1, y1, x2, y2], idx) => (
              <g key={idx}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--skullet-base, rgb(128 128 128 / 0.28))"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={x1} cy={y1} r="3.5" fill="var(--skullet-base, rgb(128 128 128 / 0.4))" />
                <circle cx={x2} cy={y2} r="3.5" fill="var(--skullet-base, rgb(128 128 128 / 0.4))" />
              </g>
            ))}
          </svg>

          <div className="space-y-6 flex flex-col items-start">
            {[78, 84, 70, 74].map((w, idx) => (
              <SkeletonBox key={idx} width={w} height={12} radius={4} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 px-2">
          <SkeletonBox width={72} height={10} radius={4} />
          <SkeletonBox width={72} height={10} radius={4} />
        </div>
      </div>
    </>
  );
}

function AuditListSkeletonBody() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <SkeletonBox width={28} height={28} radius={8} />
          <SkeletonBox width={176} height={14} radius={5} />
        </div>
        <div className="flex items-center gap-2.5">
          <PillSwitcherSkeleton widths={[30, 48, 40]} />
          <SkeletonBox width={52} height={11} radius={4} />
        </div>
      </div>

      <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
        {[
          ['42%', '74%'],
          ['36%', '68%'],
          ['46%', '78%'],
        ].map(([titleW, descW], idx) => (
          <div key={idx} className="flex items-start justify-between py-2.5 gap-3">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className="mt-1 shrink-0">
                <SkeletonBox width={8} height={8} radius={999} />
              </div>
              <div className="flex-1 space-y-1.5">
                <SkeletonBox width={titleW} height={12} radius={4} />
                <SkeletonBox width={descW} height={10} radius={4} />
              </div>
            </div>
            <SkeletonBox width={56} height={10} radius={4} />
          </div>
        ))}
      </div>
    </>
  );
}

const VARIANT_BODY_MAP = {
  traffic: TrafficSkeletonBody,
  gateway: GatewaySkeletonBody,
  line: LineSkeletonBody,
  donut: DonutSkeletonBody,
  heatmap: HeatmapSkeletonBody,
  radial: RadialSkeletonBody,
  ridgeline: RidgelineSkeletonBody,
  waves: RidgelineSkeletonBody,
  bars: StatusBarsSkeletonBody,
  table: TableSkeletonBody,
  slope: SlopeSkeletonBody,
  list: AuditListSkeletonBody,
  audit: AuditListSkeletonBody,
};

/**
 * Renders structure-matched loading skeletons for every card/chart on the
 * Monitoring dashboard so header chrome, plot geometry, and footer match the live UI.
 */
export function ChartCardSkeleton({ variant = 'line', minHeight = 340 }) {
  const BodyComponent = VARIANT_BODY_MAP[variant] || LineSkeletonBody;

  return (
    <div
      className={`${CARD_SURFACE_CLASS} p-5 sm:p-6`}
      style={{ minHeight }}
    >
      <BodyComponent />
    </div>
  );
}
