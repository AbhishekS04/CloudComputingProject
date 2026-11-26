import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Grid,
  Layers,
  Server,
  ChartBar,
  Cpu,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'reicon-react';
import { useSimulationStore } from '../../store/simulationStore';
import { BrandLogo } from '../ui/BrandLogo';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: Grid },
  { path: '/visualizer', label: 'Live Visualizer', icon: Layers },
  { path: '/servers', label: 'Server Management', icon: Server },
  { path: '/analytics', label: 'Traffic Analytics', icon: ChartBar },
  { path: '/algorithms', label: 'Algorithms', icon: Cpu },
  { path: '/logs', label: 'Request Logs', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isRunning = useSimulationStore((state) => state.isRunning);
  const targetRps = useSimulationStore((state) => state.targetRps);

  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 transition-all duration-300 z-30 shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 1. Header / Brand */}
      <div>
        <div className="flex items-center justify-between p-5 border-b border-cream-200 dark:border-charcoal-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <BrandLogo size={40} />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight text-lg text-charcoal-900 dark:text-cream-100 font-sans">
                  BIFROST
                </span>
                <span className="text-[10px] text-charcoal-400 font-medium tracking-wider uppercase">
                  Engine Visualizer
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-200 dark:hover:bg-charcoal-800 transition-colors hidden md:block"
          >
            {isCollapsed ? <ChevronRight aria-hidden="true" size={16} /> : <ChevronLeft aria-hidden="true" size={16} />}
          </button>
        </div>

        {/* 2. Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-sage-600 text-white shadow-sm'
                      : 'text-charcoal-600 dark:text-cream-300 hover:bg-cream-200 dark:hover:bg-charcoal-800 hover:text-charcoal-900'
                  } ${isCollapsed ? 'justify-center' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon aria-hidden="true" size={16} className="shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* 3. Footer / Status Badge & Version */}
      <div className="p-4 border-t border-cream-200 dark:border-charcoal-800">
        {!isCollapsed ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-cream-100 dark:bg-charcoal-800 border border-cream-200 dark:border-charcoal-700">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-charcoal-500 font-medium">Engine Status</span>
                <span className="flex items-center gap-1 font-bold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span className={isRunning ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700'}>
                    {isRunning ? 'Running' : 'Paused'}
                  </span>
                </span>
              </div>
              <div className="text-[10px] text-charcoal-400 font-mono">
                Target: {targetRps} req/s
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-charcoal-400 font-mono px-1">
              <span>BIFROST core</span>
              <span className="px-1.5 py-0.5 rounded bg-cream-200 dark:bg-charcoal-800 text-charcoal-500">
                v1.0.0
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[9px] font-mono text-charcoal-400">v1.0</span>
          </div>
        )}
      </div>
    </aside>
  );
}
