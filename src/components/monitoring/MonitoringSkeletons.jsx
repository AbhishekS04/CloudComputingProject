import React from 'react';
import { SkeletonBox } from 'skullet/react';

export function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/95 dark:bg-[#1A1A1A]/95 border border-black/[0.06] dark:border-white/[0.08] p-4 flex flex-col justify-between min-h-[148px]">
      <div className="flex items-center justify-between gap-2">
        <SkeletonBox width="52%" height={12} radius={6} />
        <SkeletonBox width={54} height={20} radius={999} />
      </div>
      <div className="my-3">
        <SkeletonBox width="64%" height={28} radius={8} />
      </div>
      <SkeletonBox width="100%" height={42} radius={8} />
      <div className="mt-2.5">
        <SkeletonBox width="78%" height={11} radius={6} />
      </div>
    </div>
  );
}

export function ChartCardSkeleton({ variant = 'line', minHeight = 340 }) {
  return (
    <div
      style={{ minHeight }}
      className="flex-1 w-full rounded-2xl bg-white/95 dark:bg-[#14161b]/95 border border-black/[0.06] dark:border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div className="space-y-2 flex-1">
          <SkeletonBox width={190} height={14} radius={6} />
          <SkeletonBox width={250} height={11} radius={6} />
        </div>
        <SkeletonBox width={116} height={26} radius={999} />
      </div>

      {/* Body Preview */}
      <div className="flex-1 flex flex-col justify-center py-4">
        {variant === 'donut' && (
          <div className="flex flex-col items-center justify-center gap-5">
            <SkeletonBox width={180} height={180} radius={999} />
            <div className="w-full grid grid-cols-2 gap-2.5">
              <SkeletonBox width="100%" height={14} radius={6} />
              <SkeletonBox width="100%" height={14} radius={6} />
              <SkeletonBox width="90%" height={14} radius={6} />
              <SkeletonBox width="85%" height={14} radius={6} />
            </div>
          </div>
        )}

        {variant === 'bars' && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.025] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <SkeletonBox width="58%" height={12} radius={6} />
                  <SkeletonBox width={48} height={12} radius={6} />
                </div>
                <SkeletonBox width="100%" height={20} radius={6} />
              </div>
            ))}
          </div>
        )}

        {variant === 'table' && (
          <div className="space-y-3">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.025] grid grid-cols-4 gap-3 items-center"
              >
                <SkeletonBox width="88%" height={14} radius={6} />
                <SkeletonBox width="76%" height={14} radius={6} />
                <SkeletonBox width="90%" height={14} radius={6} />
                <SkeletonBox width="68%" height={22} radius={999} />
              </div>
            ))}
          </div>
        )}

        {variant === 'list' && (
          <div className="space-y-2.5">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.025] flex items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <SkeletonBox width="44%" height={13} radius={6} />
                  <SkeletonBox width="78%" height={11} radius={6} />
                </div>
                <SkeletonBox width={58} height={11} radius={6} />
              </div>
            ))}
          </div>
        )}

        {(variant === 'line' || variant === 'heatmap' || variant === 'waves' || variant === 'radial') && (
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <SkeletonBox width={110} height={30} radius={8} />
              <SkeletonBox width={80} height={20} radius={999} />
            </div>
            <SkeletonBox
              width="100%"
              height={variant === 'radial' ? 210 : 185}
              radius={variant === 'radial' ? 24 : 12}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between gap-3">
        <SkeletonBox width={140} height={11} radius={6} />
        <SkeletonBox width={96} height={11} radius={6} />
      </div>
    </div>
  );
}
