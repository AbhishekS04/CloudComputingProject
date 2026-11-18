import React, { useState, useEffect } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { useServers } from '../../hooks/useServers';
import { ALGORITHM_INFO } from '../../simulation/loadBalancingAlgorithms';
import { formatPercent, formatMs, formatNumber } from '../../utils/formatters';
import {
  BookOpen,
  Slider,
  Filter,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Server,
  Shield,
  Globe,
  Activity,
  Cpu,
  HardDrive,
  Power,
  Refresh,
  Flash,
  Plus,
  Search
} from 'reicon-react';

export default function StudioRightPanel({
  step,
  stepIndex,
  totalSteps,
  nextStepTitle,
  onPrev,
  onNext,
  whatYouLearn = []
}) {
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const setSelectedNode = useSimulationStore((state) => state.setSelectedNode);
  const servers = useSimulationStore((state) => state.servers);
  const clients = useSimulationStore((state) => state.clients);
  const algorithm = useSimulationStore((state) => state.algorithm);
  const setAlgorithm = useSimulationStore((state) => state.setAlgorithm);
  const metrics = useSimulationStore((state) => state.metrics);
  const events = useSimulationStore((state) => state.events);
  const triggerTrafficSpike = useSimulationStore((state) => state.triggerTrafficSpike);
  const { toggleServerStatus, failServer, recoverServer, updateServerWeight, addServer } = useServers();

  const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'inspector' | 'logs'
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'error' | 'warning' | 'success'
  const [checkedItems, setCheckedItems] = useState({ 0: true });

  // When a node is selected in the visualizer, automatically switch to inspector tab
  useEffect(() => {
    if (selectedNode) {
      setActiveTab('inspector');
    }
  }, [selectedNode]);

  // When step changes, switch back to guide tab
  useEffect(() => {
    setActiveTab('guide');
  }, [stepIndex]);

  const toggleCheck = (idx) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const activeServer =
    selectedNode?.type === 'server'
      ? servers.find((s) => s.id === selectedNode.id)
      : null;

  const activeClient =
    selectedNode?.type === 'client'
      ? clients.find((c) => c.id === selectedNode.id)
      : null;

  const isLb = selectedNode?.type === 'lb';

  const filteredEvents = events.filter((evt) => {
    if (logFilter === 'all') return true;
    return evt.type === logFilter;
  });

  return (
    <div className="w-full lg:w-[380px] bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl shadow-subtle flex flex-col shrink-0 h-full max-h-[820px] overflow-hidden select-none">
      {/* 1. Segmented Mode Switcher */}
      <div className="p-3 border-b border-[#DDD6C6] dark:border-charcoal-700 bg-[#FAF8F2] dark:bg-charcoal-900">
        <div className="grid grid-cols-3 gap-1 bg-[#EBE6DA]/70 dark:bg-charcoal-800 p-1 rounded-xl border border-[#DDD6C6] dark:border-charcoal-700 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'guide'
                ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 font-bold shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('inspector')}
            className={`relative flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'inspector'
                ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 font-bold shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
            }`}
          >
            <Slider className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Inspector</span>
            {selectedNode && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 font-bold shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
            }`}
          >
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Audit</span>
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ========================================================
            TAB 1: STEP GUIDE (From Designed-to-scale)
           ======================================================== */}
        {activeTab === 'guide' && step && (
          <div className="space-y-4">
            {/* Step Badge & Tag */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[#DDD6C6] dark:border-charcoal-700">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-500 dark:text-cream-400">
                Step {step.stepNumber} / {totalSteps}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cream-200 border border-[#DDD6C6] dark:border-charcoal-700 uppercase">
                {step.tag || 'TECHNIQUE'}
              </span>
            </div>

            {/* Step Title */}
            <h3 className="text-base font-extrabold text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
              {step.title}
            </h3>

            {/* Editorial Explanation */}
            <p className="text-xs text-charcoal-700 dark:text-cream-300 leading-relaxed font-sans">
              {step.explanation}
            </p>

            {/* Step Hop Latency Breakdown */}
            {step.timings && step.timings.total && (
              <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700">
                <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                  <span className="text-charcoal-400 font-bold uppercase tracking-wider">Hop Latency</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                    {step.timings.total}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center">
                  <div className="p-1 rounded bg-[#F5F2EA] dark:bg-charcoal-900">
                    <div className="text-charcoal-400 text-[9px]">DNS</div>
                    <div className="font-bold text-charcoal-800 dark:text-cream-200">{step.timings.dns || '-'}</div>
                  </div>
                  <div className="p-1 rounded bg-[#F5F2EA] dark:bg-charcoal-900">
                    <div className="text-charcoal-400 text-[9px]">CONN</div>
                    <div className="font-bold text-charcoal-800 dark:text-cream-200">{step.timings.connect || '-'}</div>
                  </div>
                  <div className="p-1 rounded bg-[#F5F2EA] dark:bg-charcoal-900">
                    <div className="text-charcoal-400 text-[9px]">LB</div>
                    <div className="font-bold text-charcoal-800 dark:text-cream-200">{step.timings.lb || '-'}</div>
                  </div>
                  <div className="p-1 rounded bg-[#F5F2EA] dark:bg-charcoal-900">
                    <div className="text-charcoal-400 text-[9px]">SRV</div>
                    <div className="font-bold text-charcoal-800 dark:text-cream-200">{step.timings.server || '-'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 💡 GOOD TO KNOW Callout */}
            {step.goodToKnow && (
              <div className="p-3.5 rounded-xl bg-[#EBE6DA]/60 dark:bg-charcoal-800/80 border border-[#DDD6C6] dark:border-charcoal-700 space-y-1">
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">
                  <Lightbulb className="w-3.5 h-3.5 fill-current" />
                  <span>Good to Know</span>
                </div>
                <p className="text-[11px] text-charcoal-600 dark:text-cream-300 leading-relaxed">
                  {step.goodToKnow}
                </p>
              </div>
            )}

            {/* WHAT CHANGED Diff Block */}
            {step.whatChanged && step.whatChanged.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="font-mono text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">
                  What Changed
                </span>
                <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 space-y-1 font-mono text-xs">
                  {step.whatChanged.map((item, i) => (
                    <div key={i} className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={onPrev}
                disabled={stepIndex === 0}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-700 dark:text-cream-200 text-xs font-semibold hover:bg-cream-100 disabled:opacity-40 transition-colors shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                onClick={onNext}
                disabled={stepIndex === totalSteps - 1}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C5E5C9] hover:bg-[#B4DDB9] text-[#1E3A24] border border-[#A3D2A7] text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
              >
                <span>{nextStepTitle ? `Next: ${nextStepTitle}` : 'Next Step'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Keyboard hints */}
            <div className="text-[10px] text-center font-mono text-charcoal-400 pt-0.5">
              [ ← ] [ → ] step • [ R ] replay • [ Space ] pause
            </div>

            {/* YOU'LL LEARN Checklist */}
            {whatYouLearn && whatYouLearn.length > 0 && (
              <div className="pt-3 border-t border-[#DDD6C6] dark:border-charcoal-700 space-y-2">
                <span className="font-mono text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">
                  You'll Learn
                </span>
                <div className="space-y-1.5">
                  {whatYouLearn.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleCheck(idx)}
                      className="flex items-start gap-2 text-[11px] text-charcoal-600 dark:text-cream-300 cursor-pointer hover:text-charcoal-900 select-none"
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedItems[idx]}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-[#DDD6C6] text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                      <span className={checkedItems[idx] ? 'text-charcoal-800 dark:text-cream-100' : ''}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: NODE INSPECTOR & TUNING (From Simulator)
           ======================================================== */}
        {activeTab === 'inspector' && (
          <div className="space-y-4">
            {/* If a Server is selected */}
            {activeServer && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 flex items-center justify-center text-charcoal-800 dark:text-cream-100 shadow-xs">
                      <Server className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-charcoal-900 dark:text-cream-100 font-sans">
                        {activeServer.name}
                      </h3>
                      <p className="text-[11px] font-mono text-charcoal-400">{activeServer.ip}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider border ${
                      activeServer.status === 'healthy'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : activeServer.status === 'degraded'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {activeServer.status}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs">
                    <span className="text-charcoal-400 flex items-center gap-1 text-[10px] font-mono mb-1 uppercase">
                      <Cpu className="w-3 h-3 text-blue-500" /> CPU Load
                    </span>
                    <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                      {formatPercent(activeServer.cpu)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs">
                    <span className="text-charcoal-400 flex items-center gap-1 text-[10px] font-mono mb-1 uppercase">
                      <HardDrive className="w-3 h-3 text-purple-500" /> RAM Load
                    </span>
                    <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                      {formatPercent(activeServer.memory)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs">
                    <span className="text-charcoal-400 flex items-center gap-1 text-[10px] font-mono mb-1 uppercase">
                      <Activity className="w-3 h-3 text-emerald-500" /> Active Conns
                    </span>
                    <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                      {activeServer.connections}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs">
                    <span className="text-charcoal-400 flex items-center gap-1 text-[10px] font-mono mb-1 uppercase">
                      <Globe className="w-3 h-3 text-amber-500" /> Processed
                    </span>
                    <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                      {formatNumber(activeServer.totalRequests)}
                    </span>
                  </div>
                </div>

                {/* Weight slider (for Weighted Round Robin) */}
                <div className="p-3 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-charcoal-700 dark:text-cream-200">
                      Server Weight (Weighted RR)
                    </span>
                    <span className="font-mono font-bold text-charcoal-900 dark:text-cream-100">
                      {activeServer.weight || 1}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={activeServer.weight || 1}
                    onChange={(e) => updateServerWeight(activeServer.id, parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* Actions: Enable / Disable / Crash / Recover */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => toggleServerStatus(activeServer.id)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs border ${
                      activeServer.status === 'failed'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white dark:bg-charcoal-800 hover:bg-rose-50 border-rose-300 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>
                      {activeServer.status === 'failed' ? 'Restore / Enable Node' : 'Disable / Drain Node'}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => failServer(activeServer.id)}
                      disabled={activeServer.status === 'failed'}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold border border-rose-200 disabled:opacity-40 transition-colors"
                    >
                      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                      <span>Crash Node</span>
                    </button>
                    <button
                      onClick={() => recoverServer(activeServer.id)}
                      disabled={activeServer.status === 'healthy'}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold border border-emerald-200 disabled:opacity-40 transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" aria-hidden="true" />
                      <span>Heal Node</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* If Load Balancer is selected */}
            {isLb && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FED7AA] border border-[#252820] flex items-center justify-center shadow-xs">
                    <Shield className="w-4 h-4 text-charcoal-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-charcoal-900 dark:text-cream-100 font-sans">
                      Virtual Load Balancer
                    </h3>
                    <p className="text-[11px] font-mono text-charcoal-400">VIP: 10.0.0.1:443 (Active)</p>
                  </div>
                </div>

                {/* Algorithm Info */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs space-y-2">
                  <span className="font-mono text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">
                    Balancing Strategy
                  </span>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="w-full bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-xl px-3 py-2 text-xs font-bold text-charcoal-800 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {Object.keys(ALGORITHM_INFO).map((key) => (
                      <option key={key} value={key}>
                        {ALGORITHM_INFO[key].name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-charcoal-600 dark:text-cream-300 leading-relaxed font-sans pt-1">
                    {ALGORITHM_INFO[algorithm]?.description}
                  </p>
                </div>

                {/* Real-time Load Balancer Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs">
                    <span className="text-charcoal-400 text-[10px] font-mono uppercase block mb-1">
                      Total Dispatched
                    </span>
                    <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                      {formatNumber(metrics.totalRequests)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs">
                    <span className="text-charcoal-400 text-[10px] font-mono uppercase block mb-1">
                      Live Throughput
                    </span>
                    <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                      {metrics.currentRps} req/s
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs">
                    <span className="text-charcoal-400 text-[10px] font-mono uppercase block mb-1">
                      Average Latency
                    </span>
                    <span className="text-sm font-bold font-mono text-charcoal-800 dark:text-cream-100">
                      {formatMs(metrics.avgLatency)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs">
                    <span className="text-charcoal-400 text-[10px] font-mono uppercase block mb-1">
                      Pool Health
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-600">
                      {servers.filter((s) => s.status === 'healthy').length}/{servers.length} Healthy
                    </span>
                  </div>
                </div>

                {/* Quick Spike Button */}
                <button
                  onClick={triggerTrafficSpike}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
                >
                  <Flash className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Simulate 3x Traffic Surge</span>
                </button>
              </div>
            )}

            {/* If Client is selected */}
            {activeClient && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 flex items-center justify-center text-blue-600 shadow-xs">
                    <Globe className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-charcoal-900 dark:text-cream-100 font-sans">
                      {activeClient.name}
                    </h3>
                    <p className="text-[11px] font-mono text-charcoal-400">{activeClient.ip}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 shadow-xs space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-charcoal-400 font-mono text-[11px]">Region</span>
                    <span className="font-bold text-charcoal-800 dark:text-cream-100">{activeClient.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-400 font-mono text-[11px]">User Agent</span>
                    <span className="font-bold text-charcoal-800 dark:text-cream-100 truncate max-w-[180px]">{activeClient.userAgent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-400 font-mono text-[11px]">Dispatch Weight</span>
                    <span className="font-mono font-bold text-charcoal-800 dark:text-cream-100">{activeClient.weight}x</span>
                  </div>
                </div>
              </div>
            )}

            {/* If no node selected */}
            {!selectedNode && (
              <div className="space-y-4 text-center py-6">
                <div className="w-12 h-12 rounded-2xl bg-[#EBE6DA] dark:bg-charcoal-800 flex items-center justify-center mx-auto text-charcoal-600 dark:text-cream-300">
                  <Slider className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100">
                    Click Any Node to Inspect
                  </h4>
                  <p className="text-xs text-charcoal-500 dark:text-cream-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                    Select a backend server, the load balancer, or a client in the visualizer to tune parameters, crash nodes, or view metrics.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#DDD6C6] dark:border-charcoal-700 flex flex-col gap-2">
                  <button
                    onClick={() => addServer()}
                    disabled={servers.length >= 8}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-xs font-bold text-charcoal-800 dark:text-cream-100 hover:bg-[#EBE6DA] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add Server Node to Cluster</span>
                  </button>

                  <button
                    onClick={triggerTrafficSpike}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                  >
                    <Flash className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    <span>Trigger Traffic Surge</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: CLUSTER LOGS & AUDIT TRAIL
           ======================================================== */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-[#EBE6DA]/70 dark:bg-charcoal-800 p-1 rounded-xl border border-[#DDD6C6] dark:border-charcoal-700 text-[10px] font-mono font-bold">
              {['all', 'success', 'warning', 'error'].map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`flex-1 py-1 rounded-lg uppercase tracking-wider transition-all ${
                    logFilter === f
                      ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 shadow-xs'
                      : 'text-charcoal-500 hover:text-charcoal-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Events Stream */}
            <div className="space-y-2">
              {filteredEvents.length === 0 ? (
                <p className="text-xs text-charcoal-400 text-center py-8">No events match filter</p>
              ) : (
                filteredEvents.slice(0, 20).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 space-y-1 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-charcoal-900 dark:text-cream-100">
                        {evt.type === 'success' && <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" aria-hidden="true" />}
                        {evt.type === 'warning' && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />}
                        {evt.type === 'error' && <XCircle className="w-3 h-3 text-rose-500 shrink-0" aria-hidden="true" />}
                        {!['success', 'warning', 'error'].includes(evt.type) && (
                          <Activity className="w-3 h-3 text-blue-500 shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate">{evt.title}</span>
                      </div>
                      <span className="text-[9px] font-mono text-charcoal-400">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-charcoal-600 dark:text-cream-300 leading-snug">
                      {evt.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
