import React, { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import Visualizer2D from './Visualizer2D';
import Visualizer3D from './Visualizer3D';
import InteractiveDiagram from '../learn/InteractiveDiagram';
import { Box, Layers, GitBranch, Maximize2, Minimize2, Activity, Zap, Sliders } from 'lucide-react';

/**
 * Visualizer
 * The master visualizer canvas supporting 3 seamless modes:
 * 1. 3D Isometric (Three.js scene with live flying 3D packets & rotating nodes)
 * 2. 2D Topological (SVG flow diagram with animated request/response packets)
 * 3. Diagram View (Designed-to-scale isometric diamond grid SVG diagram)
 */
export default function Visualizer({ currentStep, activeLesson, onToggleInspector, isInspectorOpen }) {
  const visualizerMode = useSimulationStore((state) => state.visualizerMode);
  const setVisualizerMode = useSimulationStore((state) => state.setVisualizerMode);
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const setSelectedNode = useSimulationStore((state) => state.setSelectedNode);
  const activePackets = useSimulationStore((state) => state.activePackets);
  const targetRps = useSimulationStore((state) => state.targetRps);
  const isRunning = useSimulationStore((state) => state.isRunning);
  const algorithm = useSimulationStore((state) => state.algorithm);

  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      className={`relative flex flex-col gap-3 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#F5F2EA] dark:bg-charcoal-950 p-6' : 'w-full'
      }`}
    >
      {/* Visualizer Mode & Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F2] dark:bg-charcoal-900 p-2.5 px-4 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 shadow-subtle text-xs select-none">
        {/* Left: 3D / 2D / Diagram View Switcher */}
        <div className="flex items-center gap-1 bg-[#EBE6DA]/70 dark:bg-charcoal-800 p-1 rounded-xl border border-[#DDD6C6] dark:border-charcoal-700">
          <button
            onClick={() => setVisualizerMode('3D')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              visualizerMode === '3D'
                ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-blue-600" />
            <span>3D Isometric</span>
          </button>

          <button
            onClick={() => setVisualizerMode('2D')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              visualizerMode === '2D'
                ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>2D Topological</span>
          </button>

          <button
            onClick={() => setVisualizerMode('diagram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              visualizerMode === 'diagram'
                ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-amber-600" />
            <span>Diagram View</span>
          </button>
        </div>

        {/* Center: Live Flow Metrics */}
        <div className="flex items-center gap-3 text-xs text-charcoal-600 dark:text-cream-300">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold">{isRunning ? 'Real-time Flow' : 'Simulation Paused'}</span>
          </span>

          <span className="hidden sm:inline-block text-[#DDD6C6] dark:text-charcoal-700">|</span>

          <span className="hidden sm:flex items-center gap-1 font-mono text-[11px]">
            <Zap className="w-3 h-3 text-amber-500 fill-current" />
            <span className="font-bold">{targetRps} req/s</span>
          </span>

          <span className="hidden sm:inline-block text-[#DDD6C6] dark:text-charcoal-700">|</span>

          <span className="hidden sm:flex items-center gap-1 font-mono text-[11px]">
            <Activity className="w-3 h-3 text-blue-500" />
            <span className="font-bold">{activePackets.length} in-flight</span>
          </span>

          <span className="hidden md:inline-block text-[#DDD6C6] dark:text-charcoal-700">|</span>

          <span className="hidden md:inline-block font-mono text-[11px] text-charcoal-500 dark:text-cream-400">
            Strategy: <span className="font-bold text-charcoal-800 dark:text-cream-100 uppercase">{algorithm.replace(/_/g, ' ')}</span>
          </span>
        </div>

        {/* Right: Inspector toggle & Fullscreen */}
        <div className="flex items-center gap-2">
          {onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isInspectorOpen
                  ? 'bg-[#C5E5C9] text-[#1E3A24] border-[#A3D2A7] shadow-xs'
                  : 'bg-white dark:bg-charcoal-800 border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-700 dark:text-cream-200 hover:bg-[#EBE6DA]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Inspector</span>
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-700 dark:text-cream-200 hover:bg-[#EBE6DA] transition-colors shadow-xs"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 bg-[#FAF8F2] dark:bg-charcoal-900 shadow-subtle min-h-[520px]">
        {visualizerMode === '3D' && (
          <Visualizer3D
            onSelectNode={setSelectedNode}
            selectedNode={selectedNode}
          />
        )}

        {visualizerMode === '2D' && (
          <Visualizer2D
            onSelectNode={setSelectedNode}
            selectedNode={selectedNode}
          />
        )}

        {visualizerMode === 'diagram' && (
          <InteractiveDiagram
            currentStep={currentStep || {}}
            activeLesson={activeLesson || {}}
          />
        )}
      </div>
    </div>
  );
}
