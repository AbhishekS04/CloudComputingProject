import React, { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import Visualizer2D from './Visualizer2D';
import Visualizer3D from './Visualizer3D';
import {
  ThreeDCube,
  Layers,
  Maximize,
  Minimize,
  Activity
} from 'reicon-react';

/**
 * Visualizer
 * Master visualizer stage framing the 3D isometric & 2D topological models.
 */
export default function Visualizer() {
  const visualizerMode = useSimulationStore((state) => state.visualizerMode);
  const setVisualizerMode = useSimulationStore((state) => state.setVisualizerMode);
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const setSelectedNode = useSimulationStore((state) => state.setSelectedNode);
  const activePackets = useSimulationStore((state) => state.activePackets);
  const isRunning = useSimulationStore((state) => state.isRunning);
  const isDarkMode = useSimulationStore((state) => state.isDarkMode);
  const setDarkMode = useSimulationStore((state) => state.setDarkMode);

  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      className={`relative flex flex-col gap-2.5 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#F5F2EA] dark:bg-charcoal-950 p-6' : 'w-full'
      }`}
    >
      {/* 1. Unified Master Studio Command Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#FAF8F2] dark:bg-charcoal-900 p-2 px-3.5 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 shadow-subtle text-xs select-none">
        {/* Left: 3D / 2D View Switcher */}
        <div className="flex items-center gap-1 bg-[#EBE6DA]/70 dark:bg-charcoal-800 p-0.5 rounded-xl border border-[#DDD6C6] dark:border-charcoal-700">
          <button
            onClick={() => setVisualizerMode('3D')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              visualizerMode === '3D'
                ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 shadow-xs border border-[#DDD6C6] dark:border-charcoal-600 font-bold'
                : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
            }`}
          >
            <ThreeDCube className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
            <span>3D Isometric</span>
          </button>

          <button
            onClick={() => setVisualizerMode('2D')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              visualizerMode === '2D'
                ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 shadow-xs border border-[#DDD6C6] dark:border-charcoal-600 font-bold'
                : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>2D Topology</span>
          </button>
        </div>

        {/* Right: In-Flight Telemetry Badge & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* In-Flight Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 font-mono text-[11px] text-charcoal-600 dark:text-cream-300 shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <Activity className="w-3 h-3 text-blue-500" />
            <span className="font-bold">{activePackets.length} in-flight</span>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-700 dark:text-cream-200 hover:bg-[#EBE6DA] transition-colors shadow-2xs"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" aria-hidden="true" /> : <Maximize className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* 2. Main Canvas Viewport */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 bg-[#FAF8F2] dark:bg-charcoal-900 shadow-subtle min-h-[500px] lg:min-h-[520px]">
        {visualizerMode === '3D' && (
          <Visualizer3D
            theme={isDarkMode ? 'dark' : 'light'}
            onThemeChange={(nextTheme) => setDarkMode(nextTheme === 'dark')}
            onSelectNode={setSelectedNode}
            selectedNode={selectedNode}
          />
        )}

        {visualizerMode === '2D' && (
          <Visualizer2D
            theme={isDarkMode ? 'dark' : 'light'}
            onThemeChange={(nextTheme) => setDarkMode(nextTheme === 'dark')}
            onSelectNode={setSelectedNode}
            selectedNode={selectedNode}
          />
        )}
      </div>
    </div>
  );
}
