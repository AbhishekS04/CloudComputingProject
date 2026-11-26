import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, VolumeHigh, VolumeX } from 'reicon-react';
import { DuotoneIcon } from '../ui/DuotoneIcon';
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
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  useEffect(() => subscribeSoundChange(setSoundOn), []);

  const navLinks = [
    {
      label: 'Studio',
      to: '/',
      active: location.pathname === '/',
    },
    {
      label: 'Monitoring',
      to: '/monitoring',
      active: location.pathname === '/monitoring',
    },
    {
      label: 'About',
      to: '/about',
      active: location.pathname === '/about',
    },
  ];

  const menuFooter = (
    <div className="grid grid-cols-2 gap-1.5 px-1">
      <button
        type="button"
        data-cuelume-toggle
        onClick={() => toggleSound()}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-neutral-100/70 hover:bg-neutral-200/70 dark:bg-white/[0.04] dark:hover:bg-white/[0.09] px-3 py-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 active:scale-[0.97] transition-all cursor-pointer"
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
        className="flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.05] dark:border-white/[0.07] bg-neutral-100/70 hover:bg-neutral-200/70 dark:bg-white/[0.04] dark:hover:bg-white/[0.09] px-3 py-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-60"
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

        <div className="relative z-20 w-full max-w-[1380px] mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4 pointer-events-auto">
          {/* Left: BIFROST Emblem + Wordmark */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 sm:gap-3 text-[17px] sm:text-[18px] font-semibold tracking-[0.04em] text-neutral-900 dark:text-white hover:opacity-85 transition-opacity shrink-0"
          >
            <BrandLogo className="w-9 h-9 sm:w-10 sm:h-10" />
            <span>BIFROST</span>
          </Link>

          {/* Center (Desktop & Tablet): Clean Spaced Text Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 lg:gap-8"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                data-cuelume-navigate
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13.5px] tracking-tight transition-colors duration-150',
                  link.active
                    ? 'text-neutral-950 dark:text-white font-semibold'
                    : 'font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                )}
              >
                <span>{link.label}</span>
                {link.badge}
              </Link>
            ))}
          </nav>

          {/* Right (Desktop & Tablet): Sound On/Off + Light/Dark Theme */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-cuelume-toggle
              onClick={() => toggleSound()}
              className="inline-flex items-center justify-center p-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={soundOn ? 'Mute UI & Packet Sounds' : 'Enable UI & Packet Sounds'}
              aria-label={soundOn ? 'Mute UI & Packet Sounds' : 'Enable UI & Packet Sounds'}
            >
              {soundOn ? (
                <DuotoneIcon icon={VolumeHigh} size={17} className="text-emerald-500" secondaryOpacity={0.28} />
              ) : (
                <VolumeX size={17} className="opacity-60" />
              )}
            </button>

            <button
              type="button"
              data-cuelume-toggle
              disabled={isAnimating}
              onClick={() => triggerTransition()}
              className="inline-flex items-center justify-center p-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-60"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? (
                <DuotoneIcon icon={Sun} size={17} className="text-amber-400" secondaryOpacity={0.34} />
              ) : (
                <DuotoneIcon icon={Moon} size={17} className="text-indigo-500" secondaryOpacity={0.24} />
              )}
            </button>
          </div>

          {/* Right (Small Screens < md): Compact Hamburger Menu */}
          <div className="flex md:hidden items-center">
            <FloatingMenu
              links={navLinks}
              footerContent={menuFooter}
            />
          </div>
        </div>
      </header>
      <div className="h-16 shrink-0" aria-hidden="true" />
    </>
  );
}
