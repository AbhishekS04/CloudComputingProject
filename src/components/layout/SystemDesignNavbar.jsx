import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Maximize2, Minimize2, Layers, BarChart3 } from 'lucide-react';
import { useSimulationStore } from '../../store/simulationStore';
import { cn } from '../../lib/utils';

export default function SystemDesignNavbar() {
  const location = useLocation();
  const darkMode = useSimulationStore((state) => state.isDarkMode);
  const toggleDarkMode = useSimulationStore((state) => state.toggleDarkMode);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const algorithm = useSimulationStore((state) => state.algorithm);
  const targetRps = useSimulationStore((state) => state.targetRps);
  const isRunning = useSimulationStore((state) => state.isRunning);
  const servers = useSimulationStore((state) => state.servers);

  // Synchronize with live visualizer event bus if available
  const [liveState, setLiveState] = useState(null);

  useEffect(() => {
    const handleStateUpdate = (e) => {
      if (e.detail) {
        setLiveState(e.detail);
      }
    };

    window.addEventListener('lb-visualizer-state', handleStateUpdate);

    if (window.LoadBalancerVisualizer?.getState) {
      setLiveState(window.LoadBalancerVisualizer.getState());
    }

    return () => {
      window.removeEventListener('lb-visualizer-state', handleStateUpdate);
    };
  }, []);

  const activeAlgo = liveState?.algorithm || algorithm || 'ROUND ROBIN';
  const activeRps = liveState?.targetRps ?? targetRps ?? 12;
  const isOnline = liveState ? !liveState.isPaused : isRunning;
  const totalNodes = liveState?.servers ? liveState.servers.length : servers.length;
  const healthyNodes = liveState?.servers
    ? liveState.servers.filter((s) => s.healthy).length
    : servers.filter((s) => s.status === 'healthy').length;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="h-14 px-4 sm:px-6 bg-white/75 dark:bg-[#111215]/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between sticky top-0 z-50 shrink-0 select-none transition-colors duration-200 font-sans">
      {/* 1. Left: Pure Apple Brand Mark & Segmented Navigation */}
      <div className="flex items-center gap-4 sm:gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-neutral-900 to-neutral-800 dark:from-white dark:to-neutral-200 text-white dark:text-neutral-900 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5" cy="12" r="2.5" />
              <circle cx="19" cy="6" r="2" />
              <circle cx="19" cy="18" r="2" />
              <path d="M7.5 12h3.5c2 0 3-1.5 4-4.5l.5-1.5" />
              <path d="M11 12c1 0 2 1.5 3 4.5l.5 1.5" />
            </svg>
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-neutral-900 dark:text-white">
            LoadFlow
          </span>
        </Link>

        {/* Apple HIG Segmented Navigation: Studio vs Monitoring */}
        <nav className="flex items-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] text-xs">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full transition-all duration-150 text-xs font-medium cursor-pointer",
              location.pathname === '/'
                ? "bg-white dark:bg-[#202227] text-neutral-900 dark:text-white shadow-xs font-semibold"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Studio</span>
          </Link>
          <Link
            to="/monitoring"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full transition-all duration-150 text-xs font-medium cursor-pointer",
              location.pathname === '/monitoring'
                ? "bg-white dark:bg-[#202227] text-neutral-900 dark:text-white shadow-xs font-semibold"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Monitoring</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          </Link>
        </nav>
      </div>

      {/* 2. Right: Quiet Apple Telemetry & Circular Glass Utilities */}
      <div className="flex items-center gap-2">
        {/* Subtle Live Cluster Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            )}
          />
          <span className="text-neutral-600 dark:text-neutral-300 font-medium">
            {isOnline ? 'Active' : 'Paused'}
          </span>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
            {activeRps} req/s
          </span>
        </div>

        {/* Quiet Nodes Status Pill */}
        <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold text-neutral-900 dark:text-neutral-200 tabular-nums">
            {healthyNodes}/{totalNodes}
          </span>
          <span>nodes</span>
        </div>

        {/* Circular Glass Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="w-8 h-8 rounded-full bg-black/[0.03] hover:bg-black/[0.07] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-black/[0.04] dark:border-white/[0.08] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Circular Glass Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="w-8 h-8 rounded-full bg-black/[0.03] hover:bg-black/[0.07] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-black/[0.04] dark:border-white/[0.08] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
