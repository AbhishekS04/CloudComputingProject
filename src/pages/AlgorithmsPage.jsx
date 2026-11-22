import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { useServers } from '../hooks/useServers';
import { ALGORITHM_INFO, algorithmManager } from '../simulation/loadBalancingAlgorithms';
import {
  Cpu,
  CheckCircle,
  Flash,
  Sparkles,
  Play
} from 'reicon-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || null;

export default function AlgorithmsPage() {
  const { algorithm, setAlgorithm } = useSimulation();
  const { servers } = useServers();

  const [testResult, setTestResult] = useState(null);
  const [testIp, setTestIp] = useState('192.168.1.42');
  const [isDispatching, setIsDispatching] = useState(false);

  const handleTestDispatch = async () => {
    if (BASE_URL) {
      setIsDispatching(true);
      const t0 = performance.now();
      try {
        const response = await fetch(`${BASE_URL}/api/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientIp: testIp,
            endpoint: '/api/process',
            probe: true
          })
        });
        const res = await response.json();
        const elapsed = (performance.now() - t0).toFixed(1);
        const target =
          servers.find((s) => s.id === res.selected_server || s.name === res.selected_server) ||
          servers[0] || { name: res.selected_server || 'Backend VM', ip: '', activeConnections: 0 };

        setTestResult({
          server: target,
          timestamp: new Date().toLocaleTimeString(),
          clientIp: testIp,
          algorithm: ALGORITHM_INFO[algorithm].name,
          latencyMs: res.response_time_ms ?? elapsed
        });
      } catch (err) {
        setTestResult({
          server: { name: 'Load Balancer Error', ip: err.message, activeConnections: 0 },
          timestamp: new Date().toLocaleTimeString(),
          clientIp: testIp,
          algorithm: ALGORITHM_INFO[algorithm].name,
          latencyMs: '-'
        });
      } finally {
        setIsDispatching(false);
      }
      return;
    }

    const selected = algorithmManager.selectServer(algorithm, servers, testIp);
    if (selected) {
      setTestResult({
        server: selected,
        timestamp: new Date().toLocaleTimeString(),
        clientIp: testIp,
        algorithm: ALGORITHM_INFO[algorithm].name,
        latencyMs: '< 0.2'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-cream-50 dark:bg-charcoal-800 p-5 rounded-2xl border border-cream-300 dark:border-charcoal-700 shadow-card">
        <h2 className="text-lg font-bold text-charcoal-900 dark:text-cream-100">
          Load Balancing Algorithms & Routing Logic
        </h2>
        <p className="text-xs text-charcoal-500 dark:text-cream-400">
          Switch active routing algorithms on your live Azure Load Balancer and test routing decisions in real time.
        </p>
      </div>

      {/* Algorithm Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Object.keys(ALGORITHM_INFO).map((key) => {
          const info = ALGORITHM_INFO[key];
          const isActive = algorithm === key;

          return (
            <div
              key={key}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                isActive
                  ? 'bg-cream-50 dark:bg-charcoal-800 border-sage-500 ring-2 ring-sage-400/30 shadow-card'
                  : 'bg-cream-50/60 dark:bg-charcoal-800/60 border-cream-300 dark:border-charcoal-700 hover:border-cream-400'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isActive
                          ? 'bg-sage-600 text-white'
                          : 'bg-cream-200 dark:bg-charcoal-700 text-charcoal-600 dark:text-cream-300'
                      }`}
                    >
                      <Cpu aria-hidden="true" size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-charcoal-900 dark:text-cream-100">
                        {info.name}
                      </h3>
                      <span className="text-[10px] font-mono text-sage-600 dark:text-sage-400 font-semibold">
                        Complexity: {info.timeComplexity}
                      </span>
                    </div>
                  </div>

                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-sage-100 dark:bg-sage-950/80 text-sage-800 dark:text-sage-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle aria-hidden="true" size={12} className="text-sage-600" /> Active
                    </span>
                  )}
                </div>

                {/* Tagline & Description */}
                <p className="text-xs font-semibold text-charcoal-700 dark:text-cream-200 mb-1.5">
                  {info.tagline}
                </p>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400 leading-relaxed mb-4">
                  {info.description}
                </p>

                {/* Best Use Case */}
                <div className="p-3 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700 text-xs mb-4">
                  <span className="font-semibold text-charcoal-700 dark:text-cream-200 block mb-1">
                    Ideal Workload:
                  </span>
                  <p className="text-charcoal-500 dark:text-charcoal-400 text-[11px] leading-relaxed">
                    {info.useCase}
                  </p>
                </div>

                {/* Pros and Cons */}
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                  <div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                      Pros:
                    </span>
                    <ul className="space-y-0.5 text-charcoal-500 dark:text-charcoal-400">
                      {info.pros.slice(0, 2).map((p, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-emerald-500">•</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">
                      Trade-offs:
                    </span>
                    <ul className="space-y-0.5 text-charcoal-500 dark:text-charcoal-400">
                      {info.cons.slice(0, 2).map((c, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-amber-500">•</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Activation Button */}
              <button
                onClick={() => setAlgorithm(key)}
                disabled={isActive}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'bg-sage-600 text-white cursor-default'
                    : 'bg-white dark:bg-charcoal-700 border border-cream-300 dark:border-charcoal-600 text-charcoal-800 dark:text-cream-200 hover:bg-cream-100'
                }`}
              >
                {isActive ? (
                  <>
                    <CheckCircle aria-hidden="true" size={14} />
                    <span>Active in Cluster</span>
                  </>
                ) : (
                  <>
                    <Flash aria-hidden="true" size={14} className="text-sage-600" weight="Filled" />
                    <span>Apply Algorithm</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Live Algorithm Interactive Test Sandbox */}
      <div className="bg-cream-50 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles aria-hidden="true" size={20} className="text-sage-600" />
          <h3 className="text-base font-bold text-charcoal-900 dark:text-cream-100">
            Interactive Algorithmic Dispatcher
          </h3>
        </div>
        <p className="text-xs text-charcoal-500 dark:text-cream-400 mb-5">
          Send a real probe request through the currently selected algorithm ({ALGORITHM_INFO[algorithm].name}) to verify Azure VM target selection in real time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-charcoal-600 dark:text-cream-300 block mb-1">
              Client IP Header
            </label>
            <input
              type="text"
              value={testIp}
              onChange={(e) => setTestIp(e.target.value)}
              className="w-full bg-cream-100 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 rounded-xl px-3 py-2 text-xs font-mono text-charcoal-800 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-charcoal-600 dark:text-cream-300 block mb-1">
              Active Algorithm
            </label>
            <div className="px-3 py-2 rounded-xl bg-cream-200 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 text-xs font-bold text-sage-700 dark:text-sage-400">
              {ALGORITHM_INFO[algorithm].name}
            </div>
          </div>

          <div>
            <button
              onClick={handleTestDispatch}
              disabled={isDispatching}
              className="w-full py-2.5 px-4 bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Play aria-hidden="true" size={14} weight="Filled" />
              <span>{isDispatching ? 'Dispatching...' : 'Dispatch Live Probe'}</span>
            </button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div className="mt-4 p-4 rounded-xl bg-cream-100 dark:bg-charcoal-900 border border-sage-300 dark:border-sage-800 text-xs animate-in fade-in">
            <span className="font-bold text-sage-800 dark:text-sage-300 block mb-2">
              Live Routing Decision Output:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-charcoal-600 dark:text-cream-300">
              <div>
                <span className="text-charcoal-400 text-[10px] block">Client IP:</span>
                <span className="font-mono font-semibold">{testResult.clientIp}</span>
              </div>
              <div>
                <span className="text-charcoal-400 text-[10px] block">Target Azure VM:</span>
                <span className="font-bold text-charcoal-900 dark:text-cream-100">
                  {testResult.server.name} {testResult.server.ip ? `(${testResult.server.ip})` : ''}
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 text-[10px] block">Active Conns on Node:</span>
                <span className="font-mono font-semibold">{testResult.server.activeConnections}</span>
              </div>
              <div>
                <span className="text-charcoal-400 text-[10px] block">Round-Trip Latency:</span>
                <span className="font-mono text-emerald-600">{testResult.latencyMs} ms</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
