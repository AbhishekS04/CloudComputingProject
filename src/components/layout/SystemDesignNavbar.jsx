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
    <header className="h-14 px-4 sm:px-6 bg-[#FAF7F0] dark:bg-[#121212] border-b border-[#E5E0D5] dark:border-white/10 flex items-center justify-between z-30 shrink-0 select-none transition-colors duration-200">
      {/* 1. Left: Minimal Brand Typography & Segmented View Switcher */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-[15px] tracking-wider text-charcoal-900 dark:text-[#ededed] uppercase font-mono">
            LOADFLOW
          </span>
          <span className="text-[#DDD6C6] dark:text-charcoal-700 font-light text-xs hidden sm:inline">
            |
          </span>
          <span className="text-[12px] font-mono text-[#71717A] dark:text-gray-400 hidden lg:inline">
            L7 Load Balancer
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EFECE6] dark:bg-white/5 text-[#71717A] dark:text-gray-400 border border-[#DDD6C6] dark:border-white/10 hidden sm:inline">
            PROD-V1
          </span>
        </div>

        {/* Apple HIG Segmented Navigation: Studio vs Monitoring */}
        <nav className="flex items-center p-0.5 rounded-full bg-[#EAE5D8] dark:bg-white/10 border border-[#DCD5C6] dark:border-white/10 text-xs font-mono shadow-inner">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-xs font-medium cursor-pointer",
              location.pathname === '/'
                ? "bg-white dark:bg-[#252525] text-neutral-900 dark:text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Studio</span>
          </Link>
          <Link
            to="/monitoring"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-xs font-medium cursor-pointer",
              location.pathname === '/monitoring'
                ? "bg-white dark:bg-[#252525] text-neutral-900 dark:text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Monitoring</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          </Link>
        </nav>
      </div>

      {/* 2. Right: Precision Telemetry & Utility Actions */}
      <div className="flex items-center gap-2">
        {/* Unified Architecture Telemetry Capsule */}
        <div className="hidden md:flex h-8 items-center gap-2.5 px-3 rounded-full bg-white dark:bg-[#1a1a1a] border border-[#E5E0D5] dark:border-white/10 shadow-2xs text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold text-charcoal-800 dark:text-[#ededed] uppercase tracking-wide text-[10px]">
              {isOnline ? 'Cluster Online' : 'Paused'}
            </span>
          </div>

          <span className="text-[#DDD6C6] dark:text-charcoal-700">|</span>

          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-[#8E8E93] dark:text-gray-400">ALGO:</span>
            <span className="font-bold text-charcoal-900 dark:text-[#ededed]">
              {String(activeAlgo).replace(/_/g, ' ')}
            </span>
          </div>

          <span className="text-[#DDD6C6] dark:text-charcoal-700">|</span>

          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-[#8E8E93] dark:text-gray-400">RATE:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {activeRps} req/s
            </span>
          </div>
        </div>

        {/* Nodes Health Pill */}
        <div className="h-8 px-2.5 rounded-full bg-white dark:bg-[#1a1a1a] border border-[#E5E0D5] dark:border-white/10 font-mono text-[11px] text-charcoal-700 dark:text-gray-300 flex items-center gap-1.5 shadow-2xs">
          <span className="font-bold text-charcoal-900 dark:text-[#ededed]">
            {healthyNodes}/{totalNodes}
          </span>
          <span className="text-[#8E8E93] dark:text-gray-400 text-[10px]">Nodes Active</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="h-8 w-8 rounded-lg bg-white dark:bg-[#1a1a1a] border border-[#E5E0D5] dark:border-white/10 text-[#71717A] dark:text-gray-300 hover:text-charcoal-900 dark:hover:text-white hover:bg-[#F2EFE8] dark:hover:bg-white/5 active:scale-95 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="h-8 w-8 rounded-lg bg-white dark:bg-[#1a1a1a] border border-[#E5E0D5] dark:border-white/10 text-[#71717A] dark:text-gray-300 hover:text-charcoal-900 dark:hover:text-white hover:bg-[#F2EFE8] dark:hover:bg-white/5 active:scale-95 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
