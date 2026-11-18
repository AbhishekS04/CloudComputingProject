import React from 'react';
import Visualizer from '../components/visualizer/Visualizer';
import SimulationControls from '../components/controls/SimulationControls';
import { useSimulation } from '../hooks/useSimulation';
import { useServers } from '../hooks/useServers';
import { Activity, Shield, Cpu, RefreshCw, Zap, Server } from 'lucide-react';
import { formatNumber, formatMs } from '../utils/formatters';

export default function VisualizerPage() {
  const { metrics, algorithm, targetRps, isRunning } = useSimulation();
  const { servers, activeServersCount } = useServers();

  return (
    <div className="space-y-4">
      {/* Simulation Controls Dock */}
      <SimulationControls />

      {/* Visualizer Full Container */}
      <Visualizer showInspector={true} />

      {/* Mini Telemetry Strip under visualizer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Active Algorithm</span>
            <div className="text-xs font-bold text-charcoal-800 dark:text-cream-100">{algorithm.replace(/_/g, ' ')}</div>
          </div>
          <Shield className="w-4 h-4 text-sage-600" />
        </div>

        <div className="p-3 rounded-xl bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Throughput Rate</span>
            <div className="text-xs font-bold font-mono text-blue-600">{metrics.currentRps} req/s ({targetRps} target)</div>
          </div>
          <Zap className="w-4 h-4 text-blue-500" />
        </div>

        <div className="p-3 rounded-xl bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Average Latency</span>
            <div className="text-xs font-bold font-mono text-charcoal-800 dark:text-cream-100">{formatMs(metrics.avgLatency)}</div>
          </div>
          <Activity className="w-4 h-4 text-sage-600" />
        </div>

        <div className="p-3 rounded-xl bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Cluster Nodes</span>
            <div className="text-xs font-bold font-mono text-emerald-600">{activeServersCount} / {servers.length} Healthy</div>
          </div>
          <Server className="w-4 h-4 text-emerald-500" />
        </div>
      </div>
    </div>
  );
}
