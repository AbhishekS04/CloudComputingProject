import React from 'react';
import { RotateCcw, Pause, Play, Clock, Globe, Network, Shield, Server, Download } from 'lucide-react';

export default function TimingStrip({ timings, onReplay, isPlaying, onTogglePlay }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F2] dark:bg-charcoal-900 p-2.5 px-4 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 shadow-subtle text-xs">
      {/* Timing Breakdown Boxes */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Hop 1: DNS Lookup */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700">
          <Globe className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] uppercase font-mono font-bold text-charcoal-500 dark:text-cream-400">DNS LOOKUP</span>
          <span className="font-mono font-bold text-charcoal-900 dark:text-cream-100">{timings.dns || '-'}</span>
        </div>

        {/* Hop 2: Connect (TCP/TLS) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700">
          <Network className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] uppercase font-mono font-bold text-charcoal-500 dark:text-cream-400">CONNECT</span>
          <span className="font-mono font-bold text-charcoal-900 dark:text-cream-100">{timings.connect || '-'}</span>
        </div>

        {/* Hop 3: LB + Server */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700">
          <Server className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[10px] uppercase font-mono font-bold text-charcoal-500 dark:text-cream-400">REQUEST + SERVER</span>
          <span className="font-mono font-bold text-charcoal-900 dark:text-cream-100">{timings.server || '-'}</span>
        </div>

        {/* Hop 4: Download */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700">
          <Download className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-[10px] uppercase font-mono font-bold text-charcoal-500 dark:text-cream-400">DOWNLOAD</span>
          <span className="font-mono font-bold text-charcoal-900 dark:text-cream-100">-</span>
        </div>

        {/* Total Time */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EBE6DA] dark:bg-charcoal-700 border border-[#DDD6C6] dark:border-charcoal-600">
          <Clock className="w-3.5 h-3.5 text-[#1E3A24] dark:text-emerald-400" />
          <span className="text-[10px] uppercase font-mono font-extrabold text-charcoal-600 dark:text-cream-300">TOTAL</span>
          <span className="font-mono font-extrabold text-charcoal-900 dark:text-cream-100">{timings.total || '0 ms'}</span>
        </div>
      </div>

      {/* Replay & Play/Pause Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReplay}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 hover:bg-cream-100 rounded-xl font-medium text-charcoal-700 dark:text-cream-200 transition-colors shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replay</span>
        </button>

        <button
          onClick={onTogglePlay}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 hover:bg-cream-100 rounded-xl font-medium text-charcoal-700 dark:text-cream-200 transition-colors shadow-xs"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
        </button>
      </div>
    </div>
  );
}
