import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { ALGORITHM_INFO } from '../simulation/loadBalancingAlgorithms';
import { SmoothDropdown } from '../components/ui/SmoothDropdown';
import {
  Slider,
  Database,
  RotateLeft,
  CheckCircle,
  Save
} from 'reicon-react';

export default function SettingsPage() {
  const {
    targetRps,
    setTargetRps,
    algorithm,
    setAlgorithm,
    resetSimulation
  } = useSimulation();

  const [apiEndpoint, setApiEndpoint] = useState('http://localhost:8080/api');
  const [wsEndpoint, setWsEndpoint] = useState('ws://localhost:8080/stream');
  const [useRemoteBackend, setUseRemoteBackend] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-cream-50 dark:bg-charcoal-800 p-5 rounded-2xl border border-cream-300 dark:border-charcoal-700 shadow-card">
        <h2 className="text-lg font-bold text-charcoal-900 dark:text-cream-100">
          Simulation & Cluster Settings
        </h2>
        <p className="text-xs text-charcoal-500 dark:text-cream-400">
          Adjust simulation parameters, network latencies, and backend integration endpoints
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Simulation Tuning */}
        <div className="bg-cream-50 dark:bg-charcoal-800 p-6 rounded-2xl border border-cream-300 dark:border-charcoal-700 shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-cream-200 dark:border-charcoal-700">
            <Slider aria-hidden="true" size={16} className="text-sage-600" />
            <h3 className="text-sm font-bold text-charcoal-900 dark:text-cream-100 uppercase tracking-wider">
              Traffic Engine Configuration
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="font-semibold text-charcoal-700 dark:text-cream-200">
                  Baseline Traffic Rate (RPS)
                </label>
                <span className="font-mono font-bold text-sage-600">{targetRps} req/s</span>
              </div>
              <input
                type="range"
                min="1"
                max="35"
                value={targetRps}
                onChange={(e) => setTargetRps(parseInt(e.target.value))}
                className="w-full accent-sage-600 cursor-pointer"
              />
              <span className="text-[10px] text-charcoal-400">
                Number of simulated HTTP requests generated per second.
              </span>
            </div>

            <div>
              <label className="font-semibold text-charcoal-700 dark:text-cream-200 block mb-1.5">
                Default Routing Algorithm
              </label>
              <SmoothDropdown
                value={algorithm}
                onChange={setAlgorithm}
                ariaLabel="Default Routing Algorithm"
                placement="auto"
                className="w-full"
                triggerClassName="w-full bg-cream-100 dark:bg-charcoal-900 border-cream-300 dark:border-charcoal-700"
                menuClassName="w-full"
                options={Object.keys(ALGORITHM_INFO).map((k) => ({
                  value: k,
                  label: ALGORITHM_INFO[k].name,
                }))}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Future Backend Integration Layer */}
        <div className="bg-cream-50 dark:bg-charcoal-800 p-6 rounded-2xl border border-cream-300 dark:border-charcoal-700 shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-cream-200 dark:border-charcoal-700">
            <Database aria-hidden="true" size={16} className="text-sage-600" />
            <h3 className="text-sm font-bold text-charcoal-900 dark:text-cream-100 uppercase tracking-wider">
              Backend Integration Layer (Future Ready)
            </h3>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700">
            <div>
              <span className="text-xs font-bold text-charcoal-800 dark:text-cream-100 block">
                Enable Remote REST / WebSocket API
              </span>
              <span className="text-[11px] text-charcoal-400">
                Switch from client-side mock simulation to a live Go / Node.js backend cluster.
              </span>
            </div>
            <input
              type="checkbox"
              checked={useRemoteBackend}
              onChange={(e) => setUseRemoteBackend(e.target.checked)}
              className="w-4 h-4 accent-sage-600 rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-charcoal-700 dark:text-cream-200 block mb-1">
                REST API Base URL
              </label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                disabled={!useRemoteBackend}
                className="w-full bg-cream-100 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 rounded-xl px-3 py-2 font-mono text-charcoal-800 dark:text-cream-100 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="font-semibold text-charcoal-700 dark:text-cream-200 block mb-1">
                WebSocket Stream URL
              </label>
              <input
                type="text"
                value={wsEndpoint}
                onChange={(e) => setWsEndpoint(e.target.value)}
                disabled={!useRemoteBackend}
                className="w-full bg-cream-100 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 rounded-xl px-3 py-2 font-mono text-charcoal-800 dark:text-cream-100 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Cluster Reset & Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={resetSimulation}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors"
          >
            <RotateLeft aria-hidden="true" size={14} />
            <span>Reset All Telemetry & Servers</span>
          </button>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
                <CheckCircle aria-hidden="true" size={16} />
                <span>Settings Saved!</span>
              </span>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-xs font-bold shadow-subtle transition-all"
            >
              <Save aria-hidden="true" size={16} />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
