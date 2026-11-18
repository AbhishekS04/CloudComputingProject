import React, { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import Visualizer2D from './Visualizer2D';
import Visualizer3D from './Visualizer3D';
import InteractiveDiagram from '../learn/InteractiveDiagram';
import {
  ThreeDCube,
  Layers,
  Diagram,
  Maximize,
  Minimize,
  Activity,
  Flash,
  Slider,
  Play,
  Pause,
  Refresh,
  Plus,
  Minus
} from 'reicon-react';

/**
 * Visualizer
 * Consolidated, master visualizer workspace with unified studio toolbar:
 * - Tri-mode canvas: 3D Isometric, 2D Topological, Diagram View
 * - Inline flow simulation controls (Play/Pause, Traffic Stepper, Surge, Strategy)
 * - Clean telemetry indicators and full-screen view
 */
export default function Visualizer({ currentStep, activeLesson, onToggleInspector, isInspectorOpen, onReplay }) {
  const visualizerMode = useSimulationStore((state) => state.visualizerMode);
  const setVisualizerMode = useSimulationStore((state) => state.setVisualizerMode);
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const setSelectedNode = useSimulationStore((state) => state.setSelectedNode);
  const activePackets = useSimulationStore((state) => state.activePackets);
  const targetRps = useSimulationStore((state) => state.targetRps);
  const setTargetRps = useSimulationStore((state) => state.setTargetRps);
  const isRunning = useSimulationStore((state) => state.isRunning);
  const toggleSimulation = useSimulationStore((state) => state.toggleSimulation);
  const algorithm = useSimulationStore((state) => state.algorithm);
  const setAlgorithm = useSimulationStore((state) => state.setAlgorithm);
  const triggerTrafficSpike = useSimulationStore((state) => state.triggerTrafficSpike);
  const resetSimulation = useSimulationStore((state) => state.resetSimulation);

  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      className={`relative flex flex-col gap-2.5 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#F5F2EA] dark:bg-charcoal-950 p-6' : 'w-full'
      }`}
    >
      {/* 1. Unified Master Studio Command Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#FAF8F2] dark:bg-charcoal-900 p-2 px-3.5 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 shadow-subtle text-xs select-none">
        {/* Left: 3D / 2D / Diagram View Switcher */}
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

          <button
            onClick={() => setVisualizerMode('diagram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              visualizerMode === 'diagram'
                ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 shadow-xs border border-[#DDD6C6] dark:border-charcoal-600 font-bold'
                : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
            }`}
          >
            <Diagram className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            <span>Diagram</span>
          </button>
        </div>

        {/* Center: Live Simulation Controls (Pacing, Play/Pause, Spike, Algorithm) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Play / Pause Toggle */}
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              isRunning
                ? 'bg-[#E27D60] hover:bg-[#D96B4D] text-white'
                : 'bg-[#C5E5C9] hover:bg-[#B4DDB9] text-[#1E3A24] border border-[#A3D2A7]'
            }`}
            title={isRunning ? 'Pause Simulation' : 'Resume Simulation'}
          >
            {isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isRunning ? 'Pause' : 'Resume'}</span>
          </button>

          {/* Reset / Replay */}
          <button
            onClick={() => {
              if (onReplay) onReplay();
              resetSimulation();
            }}
            className="p-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300 hover:bg-[#EBE6DA] transition-colors shadow-2xs"
            title="Reset Cluster Simulation"
            aria-label="Reset Cluster Simulation"
          >
            <Refresh className="w-3 h-3" aria-hidden="true" />
          </button>

          <div className="h-3.5 w-px bg-[#DDD6C6] dark:bg-charcoal-700 hidden sm:block" />

          {/* Traffic Rate Stepper */}
          <div className="flex items-center gap-1 bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 px-2 py-0.5 rounded-xl shadow-2xs">
            <button
              onClick={() => setTargetRps(targetRps - 2)}
              disabled={targetRps <= 1}
              className="p-0.5 text-charcoal-400 hover:text-charcoal-800 disabled:opacity-30"
              title="Decrease RPS"
              aria-label="Decrease RPS"
            >
              <Minus className="w-3 h-3" aria-hidden="true" />
            </button>
            <span className="font-mono text-xs font-bold text-charcoal-800 dark:text-cream-100 min-w-[44px] text-center">
              {targetRps} rps
            </span>
            <button
              onClick={() => setTargetRps(targetRps + 2)}
              disabled={targetRps >= 40}
              className="p-0.5 text-charcoal-400 hover:text-charcoal-800 disabled:opacity-30"
              title="Increase RPS"
              aria-label="Increase RPS"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>

          {/* Surge Button */}
          <button
            onClick={triggerTrafficSpike}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-2xs transition-transform active:scale-95"
            title="Inject temporary traffic surge (+18 RPS)"
          >
            <Flash className="w-3 h-3 fill-current" aria-hidden="true" />
            <span>Surge</span>
          </button>

          {/* Algorithm Switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 px-2.5 py-1 rounded-xl shadow-2xs">
            <span className="text-[10px] font-mono font-bold text-charcoal-400 uppercase">Algo:</span>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="bg-transparent font-bold text-xs text-charcoal-800 dark:text-cream-100 focus:outline-none cursor-pointer"
            >
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="LEAST_CONNECTIONS">Least Connections</option>
              <option value="RANDOM">Random</option>
              <option value="WEIGHTED_ROUND_ROBIN">Weighted RR</option>
              <option value="IP_HASH">IP Hash</option>
            </select>
          </div>
        </div>

        {/* Right: Telemetry Badge & Fullscreen */}
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

          {onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                isInspectorOpen
                  ? 'bg-[#C5E5C9] text-[#1E3A24] border-[#A3D2A7] shadow-xs'
                  : 'bg-white dark:bg-charcoal-800 border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-700 dark:text-cream-200 hover:bg-[#EBE6DA]'
              }`}
            >
              <Slider className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Inspector</span>
            </button>
          )}

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
