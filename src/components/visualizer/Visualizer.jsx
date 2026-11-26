import React from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import Visualizer2D from './Visualizer2D';
import Visualizer3D from './Visualizer3D';
import {
  ThreeDCube,
  Layers,
  Activity,
  Flash,
  Flask,
  Nodes,
} from 'reicon-react';
import { DuotoneIcon } from '../ui/DuotoneIcon';

const IS_LIVE_BACKEND = true;

const ALGORITHMS = [
  { id: 'ROUND_ROBIN', label: 'Round Robin' },
  { id: 'LEAST_CONNECTIONS', label: 'Least Conn' },
  { id: 'IP_HASH', label: 'IP Hash' },
];

/**
 * Visualizer
 * Master visualizer stage framing the 3D isometric & 2D topological models.
 */
export default function Visualizer() {
  const visualizerMode = useSimulationStore((state) => state.visualizerMode);
  const setVisualizerMode = useSimulationStore((state) => state.setVisualizerMode);
  const clusterMode = useSimulationStore((state) => state.clusterMode);
  const setClusterMode = useSimulationStore((state) => state.setClusterMode);
  const algorithm = useSimulationStore((state) => state.algorithm);
  const setAlgorithm = useSimulationStore((state) => state.setAlgorithm);
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const setSelectedNode = useSimulationStore((state) => state.setSelectedNode);
  const lbOnline = useSimulationStore((state) => state.lbOnline);
  const isDarkMode = useSimulationStore((state) => state.isDarkMode);
  const setDarkMode = useSimulationStore((state) => state.setDarkMode);

  const algoIndex = Math.max(
    0,
    ALGORITHMS.findIndex((item) => item.id === algorithm)
  );
  const currentAlgo = ALGORITHMS[algoIndex] || ALGORITHMS[0];

  const toggleViewMode = () => {
    setVisualizerMode(visualizerMode === '3D' ? '2D' : '3D');
  };

  const toggleClusterMode = () => {
    setClusterMode(clusterMode === 'live' ? 'dummy' : 'live');
  };

  const cycleAlgorithm = () => {
    const next = ALGORITHMS[(algoIndex + 1) % ALGORITHMS.length];
    setAlgorithm(next.id);
  };

  return (
    <div className="relative flex flex-col gap-2.5 w-full transition-all">
      {/* Non-blocking Load Balancer Offline Banner (Live Mode only) */}
      {clusterMode === 'live' && IS_LIVE_BACKEND && !lbOnline && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 dark:bg-red-950/50 border border-red-500/40 text-xs">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold">
            <span>Load Balancer Offline (Port 5000 Stopped)</span>
            <span className="hidden sm:inline font-normal text-red-600/80 dark:text-red-300/80">
              — Azure backend VMs remain active (blue). Routing paused until LB restarts.
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <code className="px-2 py-0.5 rounded bg-black/10 dark:bg-black/40 text-red-800 dark:text-red-200">
              python backend/load-balancer/app.py
            </code>
            <button
              onClick={() => setClusterMode('dummy')}
              className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25 font-sans font-semibold transition-colors cursor-pointer"
            >
              Dummy Sim
            </button>
          </div>
        </div>
      )}

      {/* 1. Unobstructed Canvas Viewport */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 bg-[#FAF8F2] dark:bg-charcoal-900 shadow-subtle min-h-[450px] sm:min-h-[560px] lg:min-h-[680px]">
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

      {/* 2. Full-Width Docked Control Bar Directly Under Visualizer */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 bg-[#FAF8F2]/95 dark:bg-[#191820]/95 backdrop-blur-md px-3 py-2 shadow-subtle text-xs select-none">
        {/* Left: Single-Tap Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: 3D Isometric <-> 2D Topology */}
          <button
            type="button"
            data-cuelume-select
            onClick={toggleViewMode}
            title="Switch between 3D Isometric and 2D Topology"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 dark:bg-[#23222C] dark:hover:bg-[#2C2B37] border border-[#DDD6C6] dark:border-white/[0.08] text-[11px] sm:text-xs font-medium text-charcoal-900 dark:text-cream-100 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <DuotoneIcon
              icon={visualizerMode === '3D' ? ThreeDCube : Layers}
              size={14}
              className={
                visualizerMode === '3D'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }
              secondaryOpacity={0.28}
            />
            <span>{visualizerMode === '3D' ? '3D Isometric' : '2D Topology'}</span>
          </button>

          {/* Cluster Source Toggle: Real-Time Azure <-> Dummy Sim */}
          <button
            type="button"
            data-cuelume-select
            onClick={toggleClusterMode}
            title="Switch between Real-Time Azure and Dummy Sim"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 dark:bg-[#23222C] dark:hover:bg-[#2C2B37] border border-[#DDD6C6] dark:border-white/[0.08] text-[11px] sm:text-xs font-medium text-charcoal-900 dark:text-cream-100 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <DuotoneIcon
              icon={clusterMode === 'live' ? Flash : Flask}
              size={14}
              className={
                clusterMode === 'live'
                  ? 'text-amber-500'
                  : 'text-purple-500 dark:text-purple-400'
              }
              secondaryOpacity={0.32}
            />
            <span>{clusterMode === 'live' ? 'Real-Time Azure' : 'Dummy Sim'}</span>
          </button>

          {/* Routing Algorithm Cycler: Round Robin -> Least Conn -> IP Hash */}
          <button
            type="button"
            data-cuelume-select
            onClick={cycleAlgorithm}
            title="Cycle routing algorithm (Round Robin → Least Conn → IP Hash)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 dark:bg-[#23222C] dark:hover:bg-[#2C2B37] border border-[#DDD6C6] dark:border-white/[0.08] text-[11px] sm:text-xs font-medium text-charcoal-900 dark:text-cream-100 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <DuotoneIcon
              icon={Nodes}
              size={14}
              className="text-sky-600 dark:text-sky-400"
              secondaryOpacity={0.26}
            />
            <span>{currentAlgo.label}</span>
          </button>
        </div>

        {/* Right: Cluster Status */}
        <div className="flex items-center ml-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#23222C]/80 border border-[#DDD6C6] dark:border-white/[0.08] font-mono text-[11px] text-charcoal-600 dark:text-cream-300">
            <DuotoneIcon
              icon={Activity}
              size={13}
              className={
                clusterMode === 'live'
                  ? lbOnline
                    ? 'text-blue-500'
                    : 'text-red-500'
                  : 'text-purple-500'
              }
              secondaryOpacity={0.22}
            />
            <span>
              {clusterMode === 'live' ? (lbOnline ? 'Azure Live' : 'LB Offline') : 'Dummy Sim'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
