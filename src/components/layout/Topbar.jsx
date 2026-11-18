import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSimulationStore } from '../../store/simulationStore';
import {
  Sun,
  Moon,
  HelpCircle,
  Activity,
  Layers,
  Info,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const PAGE_NAMES = {
  '/': 'Overview Dashboard',
  '/visualizer': 'Live Infrastructure Visualizer',
  '/servers': 'Server Fleet Management',
  '/analytics': 'Traffic & Performance Analytics',
  '/algorithms': 'Load Balancing Algorithms',
  '/logs': 'Live Request Logs',
  '/settings': 'System Settings'
};

export default function Topbar() {
  const location = useLocation();
  const currentTitle = PAGE_NAMES[location.pathname] || 'Dashboard';
  const isRunning = useSimulationStore((state) => state.isRunning);
  const targetRps = useSimulationStore((state) => state.targetRps);
  const algorithm = useSimulationStore((state) => state.algorithm);

  const [darkMode, setDarkMode] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <>
      <header className="h-16 px-6 bg-cream-50/80 dark:bg-charcoal-900/80 backdrop-blur-md border-b border-cream-300 dark:border-charcoal-700 flex items-center justify-between z-20 shrink-0">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[11px] text-charcoal-400">
            <span>Cluster</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-charcoal-600 dark:text-cream-300 font-medium">Production US-East</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-sage-700 dark:text-sage-400 font-semibold">{currentTitle}</span>
          </div>
          <h1 className="text-base font-bold text-charcoal-900 dark:text-cream-100 leading-tight">
            {currentTitle}
          </h1>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* Simulation status pill */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-cream-100 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold text-charcoal-700 dark:text-cream-200">
              {isRunning ? 'Simulation Running' : 'Simulation Paused'}
            </span>
            <span className="text-charcoal-300 dark:text-charcoal-600">•</span>
            <span className="font-mono text-sage-600 font-medium">{targetRps} req/s</span>
          </div>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-cream-100 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 text-charcoal-600 dark:text-cream-200 hover:bg-cream-200 dark:hover:bg-charcoal-700 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Help Modal Trigger */}
          <button
            onClick={() => setHelpOpen(true)}
            className="p-2 rounded-xl bg-cream-100 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 text-charcoal-600 dark:text-cream-200 hover:bg-cream-200 dark:hover:bg-charcoal-700 transition-colors"
            title="Educational Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User Profile Placeholder */}
          <div className="flex items-center gap-2 pl-2 border-l border-cream-300 dark:border-charcoal-700">
            <div className="w-8 h-8 rounded-full bg-sage-200 dark:bg-sage-900 border border-sage-400 text-sage-800 dark:text-sage-200 flex items-center justify-center font-bold text-xs">
              LF
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-100 leading-none">
                DevOps Engineer
              </span>
              <span className="text-[10px] text-charcoal-400">admin@loadflow.io</span>
            </div>
          </div>
        </div>
      </header>

      {/* Educational Guide Modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cream-50 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 rounded-2xl max-w-2xl w-full p-6 shadow-modal max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-cream-200 dark:border-charcoal-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sage-100 dark:bg-sage-950/60 text-sage-600 flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-charcoal-900 dark:text-cream-100">
                    LOADFLOW Architecture & Guide
                  </h3>
                  <p className="text-xs text-charcoal-400">
                    Understanding modern load balancing and cluster traffic routing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-charcoal-600 dark:text-cream-300 leading-relaxed">
              <section>
                <h4 className="font-bold text-charcoal-800 dark:text-cream-100 text-sm mb-1">
                  How Requests Flow
                </h4>
                <p>
                  1. <strong>Clients</strong> generate HTTP requests at the configured Requests Per Second (RPS) rate.
                  <br />
                  2. <strong>Load Balancer (VIP)</strong> intercepts every incoming connection and consults its active scheduling algorithm.
                  <br />
                  3. <strong>Backend Servers</strong> receive the balanced packets, process workload, update their CPU/RAM state, and stream responses back to clients.
                </p>
              </section>

              <section className="bg-cream-100 dark:bg-charcoal-800 p-4 rounded-xl border border-cream-200 dark:border-charcoal-700">
                <h4 className="font-bold text-charcoal-800 dark:text-cream-100 text-sm mb-2">
                  Interactive Features to Explore
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>2D / 3D Switch</strong>: Toggle between isometric 3D space and high-clarity 2D topological diagram.</li>
                  <li><strong>Inspector Panel</strong>: Click any server or the load balancer in the visualizer to inspect live metrics and toggle node status.</li>
                  <li><strong>Traffic Surge ⚡</strong>: Inject a spike of 20+ RPS to observe how backend servers absorb the load.</li>
                  <li><strong>Fault Injection</strong>: Disable or fail a server from the Inspector or Server Management page and watch the load balancer reroute traffic automatically without dropped packets.</li>
                  <li><strong>Algorithms Sandbox</strong>: Switch between Round Robin, Least Connections, Random, Weighted Round Robin, and IP Hash to observe differing request distribution shapes.</li>
                </ul>
              </section>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setHelpOpen(false)}
                  className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  Got it, let's explore!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
