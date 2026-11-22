import React, { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import Visualizer2D from './Visualizer2D';
import Visualizer3D from './Visualizer3D';
import {
  Box,
  Layers,
  Maximize2,
  Minimize2,
  Activity
} from 'lucide-react';

const IS_LIVE_BACKEND = Boolean(import.meta.env.VITE_API_BASE_URL);

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
  const lbOnline = useSimulationStore((state) => state.lbOnline);
  const isDarkMode = useSimulationStore((state) => state.isDarkMode);
  const setDarkMode = useSimulationStore((state) => state.setDarkMode);

  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      className={`relative flex flex-col gap-2.5 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#F5F2EA] dark:bg-charcoal-950 p-6' : 'w-full'
      }`}
    >
      {/* System Crash Overlay when Python Flask Load Balancer stops */}
      {IS_LIVE_BACKEND && !lbOnline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/85 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl bg-charcoal-900 border-2 border-red-500 p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400 font-black text-2xl animate-pulse">
              !
            </div>
            <h2 className="text-xl font-extrabold text-red-400 tracking-wide uppercase">
              System Crash: Load Balancer Offline
            </h2>
            <p className="text-xs text-cream-300 leading-relaxed">
              Connection to the Python Flask Load Balancer (<span className="font-mono text-red-300">Port 5000</span>) was lost (<span className="font-mono">502 Connection Refused</span>). All client-to-Azure VM routing has halted.
            </p>
            <div className="p-3 rounded-xl bg-charcoal-950 border border-charcoal-800 text-[11px] font-mono text-cream-400">
              Restart <span className="text-emerald-400">python backend\load-balancer\app.py</span> to restore cluster routing.
            </div>
          </div>
        </div>
      )}

      {/* 1. Unified Master Studio Command Toolbar (Friend's Exact Layout) */}
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
            <Box className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
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
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 font-mono text-[11px] text-charcoal-600 dark:text-cream-300 shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                !lbOnline ? 'bg-red-500' : isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
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
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" /> : <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />}
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
