import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Maximize2, Minimize, VolumeHigh, VolumeX } from 'reicon-react';
import { DuotoneIcon } from '../ui/DuotoneIcon';
import { useSimulationStore } from '../../store/simulationStore';
import { useBlurFadeThemeTransition } from '../ui/BlurFadeThemeTransition';
import { isSoundEnabled, subscribeSoundChange, toggleSound } from '../../lib/sound';
import { ProgressiveBlur } from '../ui/progressive-blur';
import { FloatingMenu } from '../ui/FloatingMenu';
import { BrandLogo } from '../ui/BrandLogo';
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
      <header className="fixed top-0 inset-x-0 z-50 w-full h-16 select-none font-sans pointer-events-none">
        {/* Upside-down progressive blur + soft top fade behind floating nav typography */}
        <ProgressiveBlur position="top" height="92px" className="z-0" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[92px] z-[1] bg-gradient-to-b from-[#FAF7F0]/85 via-[#FAF7F0]/45 to-transparent dark:from-[#121212]/90 dark:via-[#121212]/45 dark:to-transparent"
        />

        <div className="relative z-20 w-full max-w-[1380px] mx-auto h-16 px-3 sm:px-6 flex items-center justify-between gap-3 pointer-events-auto">
          {/* Left: BIFROST Emblem (bigger & crisp) + Wordmark */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 sm:gap-3 text-[17px] sm:text-[18px] font-semibold tracking-[0.04em] text-neutral-900 dark:text-white hover:opacity-85 transition-opacity shrink-0"
          >
            <BrandLogo className="w-9 h-9 sm:w-10 sm:h-10" />
            <span>BIFROST</span>
          </Link>

          {/* Center (Desktop & Tablet): Clean Navigation Pill */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-1 rounded-full p-1 bg-white/80 dark:bg-[#1a1c20]/85 backdrop-blur-md border border-black/[0.07] dark:border-white/[0.09] shadow-xs"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                data-cuelume-navigate
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3.5 lg:px-4 py-1.5 text-xs transition-all duration-150',
                  link.active
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold shadow-2xs'
                    : 'font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-900/[0.05] dark:hover:bg-white/[0.07]'
                )}
              >
                <span>{link.label}</span>
                {link.badge}
              </Link>
            ))}
          </nav>

          {/* Right (Desktop & Tablet): Live Status Readout + Clean Utility Controls */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <div
              className="hidden lg:inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/75 dark:bg-[#1a1c20]/80 backdrop-blur-md border border-black/[0.07] dark:border-white/[0.09] text-[11px] text-neutral-600 dark:text-neutral-300"
              title={`${healthyNodes}/${totalNodes} healthy VMs · ${activeRps} req/s · ${activeAlgo}`}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                )}
              />
              <span className="font-semibold text-neutral-800 dark:text-neutral-100 tabular-nums">
                {healthyNodes}/{totalNodes}
              </span>
              <span className="text-neutral-300 dark:text-neutral-600">·</span>
              <span className="font-mono tabular-nums">{activeRps} req/s</span>
              <span className="hidden xl:inline text-neutral-300 dark:text-neutral-600">·</span>
              <span className="hidden xl:inline font-medium text-neutral-500 dark:text-neutral-400">
                {activeAlgo}
              </span>
            </div>

            <div className="inline-flex items-center gap-0.5 h-8 p-0.5 rounded-full bg-white/80 dark:bg-[#1a1c20]/85 backdrop-blur-md border border-black/[0.07] dark:border-white/[0.09] shadow-xs">
              <button
                type="button"
                data-cuelume-toggle
                onClick={() => toggleSound()}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-neutral-700 dark:text-neutral-200 hover:bg-neutral-900/[0.06] dark:hover:bg-white/[0.09] transition-colors cursor-pointer"
                title={soundOn ? 'Mute UI & Packet Sounds' : 'Enable UI & Packet Sounds'}
                aria-label={soundOn ? 'Mute UI & Packet Sounds' : 'Enable UI & Packet Sounds'}
              >
                {soundOn ? (
                  <DuotoneIcon icon={VolumeHigh} size={15} className="text-emerald-500" secondaryOpacity={0.28} />
                ) : (
                  <VolumeX size={15} className="opacity-60" />
                )}
              </button>

              <button
                type="button"
                data-cuelume-toggle
                disabled={isAnimating}
                onClick={() => triggerTransition()}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-neutral-700 dark:text-neutral-200 hover:bg-neutral-900/[0.06] dark:hover:bg-white/[0.09] transition-colors cursor-pointer disabled:opacity-60"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? (
                  <DuotoneIcon icon={Sun} size={15} className="text-amber-400" secondaryOpacity={0.34} />
                ) : (
                  <DuotoneIcon icon={Moon} size={15} className="text-indigo-500" secondaryOpacity={0.24} />
                )}
              </button>

              <button
                type="button"
                data-cuelume-tap
                onClick={toggleFullscreen}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-neutral-700 dark:text-neutral-200 hover:bg-neutral-900/[0.06] dark:hover:bg-white/[0.09] transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <DuotoneIcon icon={Minimize} size={15} className="text-neutral-700 dark:text-neutral-200" secondaryOpacity={0.2} />
                ) : (
                  <Maximize2 size={15} />
                )}
              </button>
            </div>
          </div>

          {/* Right (Small Screens < md): Compact Hamburger FloatingMenu */}
          <div className="flex md:hidden items-center">
            <FloatingMenu
              links={navLinks}
              footerContent={menuFooter}
              statusIndicator={
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  )}
                />
              }
            />
          </div>
        </div>
      </header>
      <div className="h-16 shrink-0" aria-hidden="true" />
    </>
  );
}
