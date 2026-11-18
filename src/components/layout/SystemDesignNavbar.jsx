import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sliders,
  Compass,
  FileSpreadsheet,
  Search,
  Globe,
  Sun,
  Moon,
  Zap,
  Layers,
  X
} from 'lucide-react';

export default function SystemDesignNavbar({ activeTab, onSelectTab, onOpenSearch }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const navTabs = [
    { id: 'learn', label: 'Learn', icon: BookOpen },
    { id: 'practice', label: 'Practice', icon: Sliders },
    { id: 'design-lab', label: 'Design Lab', icon: Compass },
    { id: 'cheatsheets', label: 'Cheatsheets', icon: FileSpreadsheet }
  ];

  return (
    <header className="h-16 px-5 bg-[#FAF8F2] dark:bg-charcoal-900 border-b border-[#DDD6C6] dark:border-charcoal-700 flex items-center justify-between z-30 shrink-0 select-none">
      {/* 1. Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-charcoal-900 dark:bg-cream-100 text-white dark:text-charcoal-900 flex items-center justify-center font-bold shadow-xs">
          <Zap className="w-4 h-4 fill-current" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-base text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
            System Design
          </span>
          <span className="text-[10px] font-mono text-charcoal-400 font-bold uppercase tracking-wider">
            LOADFLOW
          </span>
        </div>
      </div>

      {/* 2. Center: Navigation Pills (Learn, Practice, Design Lab, Cheatsheets) */}
      <nav className="hidden md:flex items-center gap-1.5 bg-[#EBE6DA]/70 dark:bg-charcoal-800 p-1 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 text-xs font-semibold">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#C5E5C9] text-[#1E3A24] font-bold border border-[#A3D2A7] shadow-xs'
                  : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900 hover:bg-cream-100/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. Right: Search, Language, Theme, Author badge (NO LOGIN / NO USER ID!) */}
      <div className="flex items-center gap-3 text-xs">
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-400 hover:text-charcoal-700 hover:border-charcoal-400 transition-colors shadow-xs"
        >
          <Search className="w-3.5 h-3.5 text-charcoal-400" />
          <span className="text-[11px] text-charcoal-400">Search lessons & concepts...</span>
          <span className="px-1.5 py-0.5 rounded bg-cream-200 dark:bg-charcoal-700 text-[10px] font-mono font-bold text-charcoal-500">
            Ctrl K
          </span>
        </button>

        {/* Language Pill */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 font-mono text-[11px] text-charcoal-700 dark:text-cream-200 shadow-xs">
          <Globe className="w-3.5 h-3.5 text-charcoal-400" />
          <span>EN</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-700 dark:text-cream-200 hover:bg-cream-100 transition-colors shadow-xs"
          title="Toggle Dark / Light Theme"
        >
          {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Badge (Clean technical badge - NO LOGIN/ID) */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-charcoal-900 text-white text-[11px] font-bold shadow-xs">
          <span className="text-[#C5E5C9]">⚡</span>
          <span>designed to scale</span>
        </div>
      </div>
    </header>
  );
}
