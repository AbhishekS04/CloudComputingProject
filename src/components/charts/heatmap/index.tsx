"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------------------------------------------------------- */
/*  Types & Constants                                                         */
/* -------------------------------------------------------------------------- */

export interface HeatmapBin {
  bin: number; // Row index (0-6)
  count: number; // Activity level (0-4) or raw number
  date: Date;
}

export interface HeatmapColumn {
  bin: number; // Column index (week number)
  bins: HeatmapBin[];
}

export const HEATMAP_DEFAULT_LEVEL_STYLES = [
  { level: 0, color: "var(--heatmap-level-0, #ebedf0)", darkColor: "#1e1e24" },
  { level: 1, color: "var(--heatmap-level-1, #9be9a8)", darkColor: "#0e4429" },
  { level: 2, color: "var(--heatmap-level-2, #40c463)", darkColor: "#006d32" },
  { level: 3, color: "var(--heatmap-level-3, #30a14e)", darkColor: "#26a641" },
  { level: 4, color: "var(--heatmap-level-4, #216e39)", darkColor: "#39d353" },
];

interface HoveredCellInfo {
  bin: number;
  colIndex: number;
  date: Date;
  count: number;
  x: number;
  y: number;
}

interface HeatmapInteractionContextValue {
  hovered: HoveredCellInfo | null;
  setHovered: (cell: HoveredCellInfo | null) => void;
}

const HeatmapInteractionContext =
  createContext<HeatmapInteractionContextValue | null>(null);

export function HeatmapInteractionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState<HoveredCellInfo | null>(null);
  return (
    <HeatmapInteractionContext.Provider value={{ hovered, setHovered }}>
      {children}
    </HeatmapInteractionContext.Provider>
  );
}

export function useHeatmapInteraction() {
  const ctx = useContext(HeatmapInteractionContext);
  if (!ctx) {
    throw new Error(
      "useHeatmapInteraction must be used within HeatmapInteractionProvider"
    );
  }
  return ctx;
}

export function HeatmapInteractionBoundary({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative w-full select-none ${className}`}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chart Context & Root                                                      */
/* -------------------------------------------------------------------------- */

interface HeatmapChartContextValue {
  data: HeatmapColumn[];
  layout: "fluid" | "fill";
  cellSize: number;
  cellHeight: number;
  gap: number;
  margin: { top: number; right: number; bottom: number; left: number };
  weekStartDay: number;
  levelStyles: typeof HEATMAP_DEFAULT_LEVEL_STYLES;
  colorScale?: (count: number) => string;
}

const HeatmapChartContext = createContext<HeatmapChartContextValue | null>(null);

function useHeatmapChart() {
  const ctx = useContext(HeatmapChartContext);
  if (!ctx) {
    throw new Error("Heatmap subcomponents must be within HeatmapChart");
  }
  return ctx;
}

function useContainerWidth(defaultWidth = 800) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      if (el.clientWidth > 0) {
        setWidth(el.clientWidth);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}

export interface HeatmapChartProps {
  data: HeatmapColumn[];
  layout?: "fluid" | "fill";
  margin?: Partial<{ top: number; right: number; bottom: number; left: number }>;
  binSize?: number;
  gap?: number;
  weekStartDay?: number;
  colorScale?: (count: number) => string;
  levelStyles?: typeof HEATMAP_DEFAULT_LEVEL_STYLES;
  className?: string;
  children: ReactNode;
}

export function HeatmapChart({
  data = [],
  layout = "fluid",
  margin: propMargin,
  binSize = 0,
  gap: propGap,
  weekStartDay = 0,
  colorScale,
  levelStyles = HEATMAP_DEFAULT_LEVEL_STYLES,
  className = "",
  children,
}: HeatmapChartProps) {
  const [containerRef, containerWidth] = useContainerWidth(800);

  const margin = useMemo(
    () => ({
      top: propMargin?.top ?? 24,
      right: propMargin?.right ?? 14,
      bottom: propMargin?.bottom ?? 0,
      left: propMargin?.left ?? 36,
    }),
    [propMargin]
  );

  const totalCols = data.length || 1;
  const availableWidth = Math.max(containerWidth - margin.left - margin.right, 260);

  // Dynamic gap based on available space and column count
  const gap = propGap !== undefined ? propGap : totalCols > 32 ? 3.5 : 4.5;

  // Fluid cell sizing that expands to fill the entire container width
  const cellSize = useMemo(() => {
    if (binSize > 0 && layout !== "fluid") return binSize;
    const rawStep = (availableWidth - (totalCols - 1) * gap) / totalCols;
    return Math.max(Number(rawStep.toFixed(2)), 12);
  }, [binSize, layout, availableWidth, totalCols, gap]);

  // Proportional height for elegant capsule cells (matching Reference Image 4)
  const cellHeight = useMemo(() => {
    return Math.min(Math.max(Math.round(cellSize * 0.85), 14), 28);
  }, [cellSize]);

  const value = useMemo(
    () => ({
      data,
      layout,
      cellSize,
      cellHeight,
      gap,
      margin,
      weekStartDay,
      levelStyles,
      colorScale,
    }),
    [data, layout, cellSize, cellHeight, gap, margin, weekStartDay, levelStyles, colorScale]
  );

  return (
    <HeatmapChartContext.Provider value={value}>
      <div
        ref={containerRef}
        className={`relative flex flex-col w-full overflow-x-hidden ${className}`}
      >
        {children}
      </div>
    </HeatmapChartContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  HeatmapCells                                                              */
/* -------------------------------------------------------------------------- */

export interface HeatmapCellsProps {
  cornerRadius?: number;
  colorScale?: (count: number) => string;
  inactiveOpacity?: number;
  inactiveScale?: number;
  activeScale?: number;
  rowOpacity?: number | number[];
  interactive?: boolean;
}

export function HeatmapCells({
  cornerRadius: propCornerRadius,
  colorScale: cellColorScale,
  inactiveOpacity = 0.35,
  inactiveScale = 1,
  activeScale = 1.15,
  rowOpacity = 1,
  interactive = true,
}: HeatmapCellsProps) {
  const { data, cellSize, cellHeight, gap, margin, levelStyles, colorScale: chartColorScale } =
    useHeatmapChart();
  const { hovered, setHovered } = useHeatmapInteraction();

  const activeColorScale = cellColorScale || chartColorScale;

  const totalColumns = data.length;
  const gridWidth = totalColumns * (cellSize + gap) - gap + margin.left + margin.right;
  const gridHeight = 7 * (cellHeight + gap) - gap + margin.top + margin.bottom;

  // Auto-adapt corner radius to cell size (3px - 6px)
  const cornerRadius =
    propCornerRadius ?? Math.min(Math.max(Math.round(cellSize * 0.18), 3), 6);

  // Resolve color for a count
  const getColor = (count: number) => {
    if (activeColorScale) return activeColorScale(count);
    const lvl = Math.min(Math.max(count, 0), 4);
    const style = levelStyles[lvl] || levelStyles[0];
    return style.color;
  };

  return (
    <div className="relative w-full">
      <svg
        width="100%"
        height={gridHeight}
        viewBox={`0 0 ${gridWidth} ${gridHeight}`}
        className="overflow-visible block w-full"
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {data.map((col, cIdx) => {
            const x = cIdx * (cellSize + gap);
            return (
              <g key={col.bin ?? cIdx}>
                {col.bins.map((bin) => {
                  const y = bin.bin * (cellHeight + gap);
                  const isHovered =
                    hovered?.colIndex === cIdx && hovered?.bin === bin.bin;
                  const isAnyHovered = hovered !== null;

                  const opacity = isAnyHovered
                    ? isHovered
                      ? 1
                      : inactiveOpacity
                    : Array.isArray(rowOpacity)
                    ? rowOpacity[bin.bin] ?? 1
                    : rowOpacity;

                  const scale = isHovered ? activeScale : 1;
                  const level = Math.min(Math.max(bin.count, 0), 4);

                  return (
                    <rect
                      key={bin.bin}
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellHeight}
                      rx={cornerRadius}
                      ry={cornerRadius}
                      fill={getColor(bin.count)}
                      style={{
                        fill: `var(--heatmap-level-${level}, ${getColor(bin.count)})`,
                        opacity,
                        transform: scale !== 1 ? `scale(${scale})` : undefined,
                        transformOrigin: `${x + cellSize / 2}px ${y + cellHeight / 2}px`,
                        transition: "all 0.15s ease-out",
                      }}
                      className="cursor-pointer transition-colors duration-150"
                      onMouseEnter={(e) => {
                        if (!interactive) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHovered({
                          bin: bin.bin,
                          colIndex: cIdx,
                          date: bin.date,
                          count: bin.count,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => {
                        if (interactive) setHovered(null);
                      }}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Axes: HeatmapXAxis & HeatmapYAxis                                         */
/* -------------------------------------------------------------------------- */

export interface HeatmapXAxisProps {
  className?: string;
}

export function HeatmapXAxis({ className = "" }: HeatmapXAxisProps) {
  const { data, cellSize, gap, margin } = useHeatmapChart();

  // Find month change columns
  const monthLabels = useMemo(() => {
    const labels: { colIndex: number; name: string }[] = [];
    let lastMonth = -1;

    data.forEach((col, idx) => {
      const firstDate = col.bins[0]?.date;
      if (firstDate instanceof Date && !isNaN(firstDate.getTime())) {
        const month = firstDate.getMonth();
        if (month !== lastMonth) {
          lastMonth = month;
          labels.push({
            colIndex: idx,
            name: firstDate.toLocaleString("en-US", { month: "short" }),
          });
        }
      }
    });

    return labels;
  }, [data]);

  return (
    <div
      className={`absolute top-0 left-0 pointer-events-none text-[10px] font-mono text-neutral-400 dark:text-neutral-500 ${className}`}
      style={{ marginLeft: margin.left, height: margin.top }}
    >
      {monthLabels.map((m) => {
        const left = m.colIndex * (cellSize + gap);
        return (
          <span
            key={`${m.colIndex}-${m.name}`}
            className="absolute top-1 whitespace-nowrap"
            style={{ left }}
          >
            {m.name}
          </span>
        );
      })}
    </div>
  );
}

export interface HeatmapYAxisProps {
  tickFilter?: "all" | "odd" | "even";
  labelFormat?: "full" | "initial";
  className?: string;
}

export function HeatmapYAxis({
  tickFilter = "odd",
  labelFormat = "full",
  className = "",
}: HeatmapYAxisProps) {
  const { cellHeight, gap, margin, weekStartDay } = useHeatmapChart();

  const daysSundayFirst = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysMondayFirst = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const baseDays = weekStartDay === 1 ? daysMondayFirst : daysSundayFirst;

  return (
    <div
      className={`absolute left-0 pointer-events-none text-[9.5px] font-mono text-neutral-400 dark:text-neutral-500 ${className}`}
      style={{
        top: margin.top,
        width: margin.left,
      }}
    >
      {baseDays.map((day, idx) => {
        // filter ticks
        if (tickFilter === "odd" && idx % 2 === 0) return null;
        if (tickFilter === "even" && idx % 2 !== 0) return null;

        const top = idx * (cellHeight + gap) + cellHeight / 2 - 6;
        const text = labelFormat === "initial" ? day[0] : day;

        return (
          <span
            key={day}
            className="absolute left-1"
            style={{ top }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  HeatmapTooltip                                                            */
/* -------------------------------------------------------------------------- */

export interface HeatmapTooltipProps {
  className?: string;
}

export function HeatmapTooltip({ className = "" }: HeatmapTooltipProps) {
  const { hovered } = useHeatmapInteraction();

  if (!hovered) return null;

  const dateStr = hovered.date instanceof Date
    ? hovered.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";

  return (
    <div
      className={`pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full mb-2 px-2.5 py-1.5 rounded-lg bg-neutral-900/95 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[11px] font-mono shadow-md backdrop-blur-md border border-white/10 dark:border-black/10 transition-all duration-75 ${className}`}
      style={{
        left: hovered.x,
        top: hovered.y - 6,
      }}
    >
      <div className="font-semibold">
        {hovered.count} {hovered.count === 1 ? "request spike" : "activity units"}
      </div>
      <div className="text-[10px] text-neutral-400 dark:text-neutral-600">
        {dateStr}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  HeatmapLegend                                                             */
/* -------------------------------------------------------------------------- */

export interface HeatmapLegendProps {
  lessLabel?: string;
  moreLabel?: string;
  cellSize?: number;
  gap?: number;
  levelStyles?: typeof HEATMAP_DEFAULT_LEVEL_STYLES;
  className?: string;
}

export function HeatmapLegend({
  lessLabel = "Less",
  moreLabel = "More",
  cellSize = 10,
  gap = 3,
  levelStyles = HEATMAP_DEFAULT_LEVEL_STYLES,
  className = "",
}: HeatmapLegendProps) {
  return (
    <div
      className={`flex items-center justify-end gap-1.5 text-[10px] font-mono text-neutral-400 dark:text-neutral-500 ${className}`}
    >
      <span>{lessLabel}</span>
      <div className="flex items-center" style={{ gap }}>
        {levelStyles.map((item) => (
          <span
            key={item.level}
            className="rounded-[2px] border border-black/5 dark:border-white/5"
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: `var(--heatmap-level-${item.level}, ${item.color})`,
            }}
          />
        ))}
      </div>
      <span>{moreLabel}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                 */
/* -------------------------------------------------------------------------- */

export function buildHeatmapRowOpacity(
  predicateOrRows: number[] | ((row: number) => boolean),
  fadedOpacity = 0.35
) {
  return Array.from({ length: 7 }, (_, row) => {
    if (typeof predicateOrRows === "function") {
      return predicateOrRows(row) ? fadedOpacity : 1;
    }
    return predicateOrRows.includes(row) ? fadedOpacity : 1;
  });
}

/* -------------------------------------------------------------------------- */
/*  Radial Chart Exports                                                      */
/* -------------------------------------------------------------------------- */

export * from "../radial-chart";
export * from "../radial-axis";
export * from "../radial-dot-bar";
export * from "../radial-scrubber";
export * from "../radial-center";
export * from "../radial-legend";

