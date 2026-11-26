import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Maximize2, Minimize, VolumeHigh, VolumeX } from 'reicon-react';
import { DuotoneIcon } from '../ui/DuotoneIcon';
import { useSimulationStore } from '../../store/simulationStore';
import { useBlurFadeThemeTransition } from '../ui/BlurFadeThemeTransition';
import { isSoundEnabled, subscribeSoundChange, toggleSound } from '../../lib/sound';
import { ProgressiveBlur } from '../ui/progressive-blur';
import { FloatingMenu } from '../ui/FloatingMenu';
import { cn } from '../../lib/utils';

export default function SystemDesignNavbar() {
  const location = useLocation();
  const { theme, triggerTransition, isAnimating } = useBlurFadeThemeTransition();
  const darkMode = theme === 'dark';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  useEffect(() => subscribeSoundChange(setSoundOn), []);

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

  const navLinks = [
    {
      label: 'Studio',
      to: '/',
      active: location.pathname === '/',
    },
    {
      label: 'Monitoring',
      to: '/monitoring',
      badge: (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      ),
      active: location.pathname === '/monitoring',
    },
    {
      label: 'About',
      to: '/about',
      active: location.pathname === '/about',
    },
  ];

  const menuFooter = (
    <div className="space-y-2.5 px-1">
      {/* Compact Live Cluster Readout */}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-neutral-100/80 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] px-3 py-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            )}
          />
          <span className="font-medium text-neutral-700 dark:text-neutral-200">
            {isOnline ? 'Active' : 'Paused'}
          </span>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
            {activeRps} req/s
          </span>
        </div>

        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
          <span className="tabular-nums font-medium text-neutral-700 dark:text-neutral-200">
            {healthyNodes}/{totalNodes} nodes
          </span>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <span className="text-[10px] tracking-wide font-medium">
            {activeAlgo}
          </span>
        </div>
      </div>

      {/* Sound, Theme & Fullscreen Utilities */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          data-cuelume-toggle
          onClick={() => toggleSound()}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-neutral-100/70 hover:bg-neutral-200/70 dark:bg-white/[0.04] dark:hover:bg-white/[0.09] px-2.5 py-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 active:scale-[0.97] transition-all cursor-pointer"
          title={soundOn ? 'Mute UI & Packet Sounds' : 'Enable UI & Packet Sounds'}
          aria-label={soundOn ? 'Mute UI & Packet Sounds' : 'Enable UI & Packet Sounds'}
        >
          {soundOn ? (
            <DuotoneIcon icon={VolumeHigh} size={15} className="text-emerald-500" secondaryOpacity={0.28} />
          ) : (
            <VolumeX size={15} className="opacity-60" />
          )}
          <span>{soundOn ? 'Sound' : 'Muted'}</span>
        </button>

        <button
          type="button"
          data-cuelume-toggle
          disabled={isAnimating}
          onClick={() => triggerTransition()}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-neutral-100/70 hover:bg-neutral-200/70 dark:bg-white/[0.04] dark:hover:bg-white/[0.09] px-2.5 py-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-60"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? (
            <DuotoneIcon icon={Sun} size={15} className="text-amber-400" secondaryOpacity={0.34} />
          ) : (
            <DuotoneIcon icon={Moon} size={15} className="text-indigo-500" secondaryOpacity={0.24} />
          )}
          <span>{darkMode ? 'Dark' : 'Light'}</span>
        </button>

        <button
          type="button"
          data-cuelume-tap
          data-cuelume-emphasis="subtle"
          onClick={toggleFullscreen}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-neutral-100/70 hover:bg-neutral-200/70 dark:bg-white/[0.04] dark:hover:bg-white/[0.09] px-2.5 py-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 active:scale-[0.97] transition-all cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <DuotoneIcon icon={Minimize} size={15} className="text-neutral-700 dark:text-neutral-200" secondaryOpacity={0.2} />
          ) : (
            <Maximize2 size={15} />
          )}
          <span>{isFullscreen ? 'Exit' : 'Expand'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 w-full h-14 select-none font-sans pointer-events-none">
        {/* Upside-down progressive blur + soft top fade behind floating nav typography */}
        <ProgressiveBlur position="top" height="88px" className="z-0" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[84px] z-[1] bg-gradient-to-b from-[#FAF7F0]/80 via-[#FAF7F0]/35 to-transparent dark:from-[#121212]/85 dark:via-[#121212]/40 dark:to-transparent"
        />

        <div className="relative z-20 w-full max-w-[1380px] mx-auto h-14 px-3 sm:px-6 flex items-center justify-between pointer-events-auto">
          {/* Left: Pure Text Wordmark Only (no logo icon) */}
          <Link
            to="/"
            className="text-[16px] font-semibold tracking-[-0.025em] text-neutral-900 dark:text-white hover:opacity-75 transition-opacity"
          >
            LoadFlow
          </Link>

          {/* Right: Compact Refined Floating Menu */}
          <FloatingMenu
            links={navLinks}
            footerContent={menuFooter}
          />
        </div>
      </header>
      <div className="h-14 shrink-0" aria-hidden="true" />
    </>
  );
}
