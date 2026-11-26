import React from 'react';
import { useSimulation } from '../../hooks/useSimulation';
import { useServers } from '../../hooks/useServers';
import { ALGORITHM_INFO } from '../../simulation/loadBalancingAlgorithms';
import { SmoothDropdown } from '../ui/SmoothDropdown';
import {
  Play,
  Pause,
  RotateLeft,
  Flash,
  Plus,
  Minus,
  Activity
} from 'reicon-react';

export default function SimulationControls() {
  const {
    isRunning,
    targetRps,
    algorithm,
    toggleSimulation,
    setTargetRps,
    setAlgorithm,
    resetSimulation,
    triggerTrafficSpike
  } = useSimulation();

  const { addServer, servers } = useServers();

  return (
    <div className="bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl p-3 px-4 shadow-subtle flex flex-wrap items-center justify-between gap-3 text-xs select-none">
      {/* 1. Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSimulation}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs ${
            isRunning
              ? 'bg-[#E27D60] hover:bg-[#D96B4D] text-white'
              : 'bg-[#C5E5C9] hover:bg-[#B4DDB9] text-[#1E3A24] border border-[#A3D2A7]'
          }`}
        >
          {isRunning ? <Pause aria-hidden="true" size={14} weight="Filled" /> : <Play aria-hidden="true" size={14} weight="Filled" />}
          <span>{isRunning ? 'Pause' : 'Resume'}</span>
        </button>

        <button
          onClick={resetSimulation}
          className="p-2 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300 hover:bg-[#EBE6DA] transition-colors shadow-xs"
          title="Reset Simulation Metrics"
          aria-label="Reset Simulation Metrics"
        >
          <RotateLeft aria-hidden="true" size={14} />
        </button>
      </div>

      {/* 2. Traffic Volume & Spike Generator */}
      <div className="flex items-center gap-2.5 bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 px-3 py-1.5 rounded-xl shadow-xs">
        <span className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Activity aria-hidden="true" size={14} className="text-emerald-600" />
          <span>Traffic:</span>
        </span>

        <button
          onClick={() => setTargetRps(targetRps - 2)}
          disabled={targetRps <= 1}
          aria-label="Decrease traffic rate"
          className="p-1 rounded-md text-charcoal-400 hover:text-charcoal-700 hover:bg-[#EBE6DA] disabled:opacity-30"
        >
          <Minus aria-hidden="true" size={12} />
        </button>

        <span className="font-mono text-xs font-bold text-charcoal-900 dark:text-cream-100 min-w-[50px] text-center">
          {targetRps} req/s
        </span>

        <button
          onClick={() => setTargetRps(targetRps + 2)}
          disabled={targetRps >= 40}
          aria-label="Increase traffic rate"
          className="p-1 rounded-md text-charcoal-400 hover:text-charcoal-700 hover:bg-[#EBE6DA] disabled:opacity-30"
        >
          <Plus aria-hidden="true" size={12} />
        </button>

        <input
          type="range"
          min="1"
          max="35"
          value={targetRps}
          onChange={(e) => setTargetRps(parseInt(e.target.value))}
          className="w-20 accent-emerald-600 cursor-pointer hidden md:inline-block"
        />

        <div className="h-4 w-px bg-[#DDD6C6] dark:bg-charcoal-700 mx-1" />

        <button
          onClick={triggerTrafficSpike}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-xs transition-transform active:scale-95"
        >
          <Flash aria-hidden="true" size={12} weight="Filled" />
          <span>Traffic Spike</span>
        </button>
      </div>

      {/* 3. Algorithm Selector */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider font-mono hidden xl:inline-block">
          Algorithm:
        </span>
        <SmoothDropdown
          value={algorithm}
          onChange={setAlgorithm}
          ariaLabel="Routing algorithm"
          placement="auto"
          triggerClassName="bg-white dark:bg-charcoal-800 border-[#DDD6C6] dark:border-charcoal-700 font-bold"
          options={Object.keys(ALGORITHM_INFO).map((key) => ({
            value: key,
            label: ALGORITHM_INFO[key].name,
          }))}
        />
      </div>

      {/* 4. Quick Server Add Button */}
      <div>
        <button
          onClick={() => addServer()}
          disabled={servers.length >= 8}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-charcoal-800 hover:bg-[#EBE6DA] border border-[#DDD6C6] dark:border-charcoal-700 disabled:opacity-50 text-charcoal-800 dark:text-cream-100 text-xs font-bold transition-colors shadow-xs"
        >
          <Plus aria-hidden="true" size={14} className="text-emerald-600" />
          <span>Add Node</span>
        </button>
      </div>
    </div>
  );
}
