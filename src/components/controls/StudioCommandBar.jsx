import React from 'react';
import { useSimulation } from '../../hooks/useSimulation';
import { useServers } from '../../hooks/useServers';
import { ALGORITHM_INFO } from '../../simulation/loadBalancingAlgorithms';
import {
  Play,
  Pause,
  RotateLeft,
  Flash,
  Plus,
  Minus,
  Activity,
  Globe,
  Diagram,
  Server,
  Clock
} from 'reicon-react';

/**
 * StudioCommandBar
 * Decluttered, unified studio command strip combining simulation playback,
 * traffic rate controls, algorithm switcher, and real-time latency hop telemetry
 * into a single calm, editorial toolbar.
 */
export default function StudioCommandBar({ timings = {}, onReplay }) {
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
    <div className="bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl p-2.5 px-4 shadow-subtle flex flex-wrap items-center justify-between gap-3 text-xs select-none">
      {/* 1. Playback & Traffic Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={toggleSimulation}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
            isRunning
              ? 'bg-[#E27D60] hover:bg-[#D96B4D] text-white'
              : 'bg-[#C5E5C9] hover:bg-[#B4DDB9] text-[#1E3A24] border border-[#A3D2A7]'
          }`}
        >
          {isRunning ? <Pause aria-hidden="true" size={14} weight="Filled" /> : <Play aria-hidden="true" size={14} weight="Filled" />}
          <span>{isRunning ? 'Pause' : 'Resume'}</span>
        </button>

        {/* Replay / Reset */}
        <button
          onClick={() => {
            if (onReplay) onReplay();
            resetSimulation();
          }}
          className="p-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300 hover:bg-[#EBE6DA] transition-colors shadow-2xs"
          title="Reset Simulation"
          aria-label="Reset Simulation"
        >
          <RotateLeft aria-hidden="true" size={14} />
        </button>

        <div className="h-4 w-px bg-[#DDD6C6] dark:bg-charcoal-700 mx-1 hidden sm:block" />

        {/* Traffic Rate Stepper */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 px-2.5 py-1 rounded-xl shadow-2xs">
          <Activity aria-hidden="true" size={12} className="text-emerald-600" />
          <span className="font-mono text-[11px] font-bold text-charcoal-500 uppercase">Traffic:</span>
          <button
            onClick={() => setTargetRps(targetRps - 2)}
            disabled={targetRps <= 1}
            aria-label="Decrease traffic rate"
            className="p-0.5 rounded text-charcoal-400 hover:text-charcoal-800 disabled:opacity-30"
          >
            <Minus aria-hidden="true" size={12} />
          </button>
          <span className="font-mono text-xs font-bold text-charcoal-900 dark:text-cream-100 min-w-[42px] text-center">
            {targetRps} rps
          </span>
          <button
            onClick={() => setTargetRps(targetRps + 2)}
            disabled={targetRps >= 40}
            aria-label="Increase traffic rate"
            className="p-0.5 rounded text-charcoal-400 hover:text-charcoal-800 disabled:opacity-30"
          >
            <Plus aria-hidden="true" size={12} />
          </button>
        </div>

        {/* Traffic Spike Button */}
        <button
          onClick={triggerTrafficSpike}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-2xs transition-transform active:scale-95"
          title="Simulate 3x traffic surge"
        >
          <Flash aria-hidden="true" size={12} weight="Filled" />
          <span>Spike</span>
        </button>

        {/* Algorithm Selector */}
        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value)}
          className="bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 rounded-xl px-2.5 py-1 text-xs font-bold text-charcoal-800 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
        >
          {Object.keys(ALGORITHM_INFO).map((key) => (
            <option key={key} value={key}>
              {ALGORITHM_INFO[key].name}
            </option>
          ))}
        </select>

        {/* Add Node */}
        <button
          onClick={() => addServer()}
          disabled={servers.length >= 8}
          className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-charcoal-800 hover:bg-[#EBE6DA] border border-[#DDD6C6] dark:border-charcoal-700 disabled:opacity-40 text-charcoal-700 dark:text-cream-200 text-xs font-semibold shadow-2xs"
        >
          <Plus aria-hidden="true" size={12} className="text-emerald-600" />
          <span>Node</span>
        </button>
      </div>

      {/* 2. Latency Hop Telemetry (Clean, Quiet Pills) */}
      <div className="flex items-center gap-1.5 font-mono text-[10px]">
        {/* DNS */}
        <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300">
          <Globe aria-hidden="true" size={10} className="text-amber-500" />
          <span className="text-charcoal-400">DNS:</span>
          <span className="font-bold">{timings.dns || '20ms'}</span>
        </div>

        {/* CONNECT */}
        <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300">
          <Diagram aria-hidden="true" size={10} className="text-blue-500" />
          <span className="text-charcoal-400">TCP:</span>
          <span className="font-bold">{timings.connect || '12ms'}</span>
        </div>

        {/* SERVER */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300">
          <Server aria-hidden="true" size={10} className="text-emerald-500" />
          <span className="text-charcoal-400">SRV:</span>
          <span className="font-bold">{timings.server || '28ms'}</span>
        </div>

        {/* TOTAL LATENCY BADGE */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EBE6DA] dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 font-bold text-charcoal-900 dark:text-cream-100 shadow-2xs">
          <Clock aria-hidden="true" size={12} className="text-emerald-700" />
          <span>TOTAL:</span>
          <span>{timings.total || '60ms'}</span>
        </div>
      </div>
    </div>
  );
}
