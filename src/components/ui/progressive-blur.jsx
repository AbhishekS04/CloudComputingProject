import React from "react"

import { cn } from "@/lib/utils"

export function ProgressiveBlur({
  className,
  height = "30%",
  position = "bottom",
  blurLevels = [2, 6, 12]
}) {
  const tierCount = blurLevels.length;
  const bandStep = 100 / Math.max(1, tierCount);

  return (
    <div
      className={cn(
        "gradient-blur pointer-events-none absolute inset-x-0 z-10",
        className,
        position === "top"
          ? "top-0"
          : position === "bottom"
            ? "bottom-0"
            : "inset-y-0"
      )}
      style={{
        height: position === "both" ? "100%" : height,
      }}
    >
      {blurLevels.map((blurPx, index) => {
        const startPercent = Math.max(0, index * bandStep - bandStep * 0.25);
        const endPercent = Math.min(100, (index + 1) * bandStep);
        const maskGradient =
          position === "bottom"
            ? `linear-gradient(to bottom, rgba(0,0,0,0) ${startPercent}%, rgba(0,0,0,1) ${endPercent}%, rgba(0,0,0,1) 100%)`
            : position === "top"
              ? `linear-gradient(to top, rgba(0,0,0,0) ${startPercent}%, rgba(0,0,0,1) ${endPercent}%, rgba(0,0,0,1) 100%)`
              : `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)`;

        return (
          <div
            key={`blur-${index}`}
            className="absolute inset-0"
            style={{
              zIndex: index + 1,
              backdropFilter: `blur(${blurPx}px)`,
              WebkitBackdropFilter: `blur(${blurPx}px)`,
              maskImage: maskGradient,
              WebkitMaskImage: maskGradient,
            }}
          />
        );
      })}
    </div>
  )
}
