import React from 'react';
import { CHEATSHEETS_DATA } from '../../data/courseData';
import { FileSpreadsheet, Clock, Shield, CheckCircle2 } from 'lucide-react';

export default function CheatsheetsView() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#FAF8F2] dark:bg-charcoal-900 p-6 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 shadow-subtle">
        <div className="flex items-center gap-2 mb-1">
          <FileSpreadsheet className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <h2 className="text-xl font-extrabold text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
            System Design Cheatsheets & Reference Matrices
          </h2>
        </div>
        <p className="text-xs text-charcoal-500 dark:text-cream-400">
          Essential architectural rules of thumb, complexity constants, and latency numbers every backend engineer should memorize.
        </p>
      </div>

      {CHEATSHEETS_DATA.map((section, idx) => (
        <div
          key={idx}
          className="bg-[#FAF8F2] dark:bg-charcoal-900 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 overflow-hidden shadow-subtle"
        >
          <div className="p-4 border-b border-[#DDD6C6] dark:border-charcoal-700 bg-[#EBE6DA]/40 dark:bg-charcoal-800/40">
            <h3 className="text-sm font-bold text-charcoal-900 dark:text-cream-100 uppercase tracking-wider font-mono">
              {section.category}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#DDD6C6] dark:border-charcoal-700 text-[10px] font-mono uppercase tracking-wider text-charcoal-400">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Metric / Time</th>
                  <th className="py-3 px-4">State / Architecture</th>
                  <th className="py-3 px-4">Strengths</th>
                  <th className="py-3 px-4">Trade-offs</th>
                  <th className="py-3 px-4">Ideal Use Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD6C6]/60 dark:divide-charcoal-700/60">
                {section.items.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/60 dark:hover:bg-charcoal-800/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-charcoal-800 dark:text-cream-100">
                      {row.name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {row.time}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-charcoal-600 dark:text-cream-300">
                      {row.state}
                    </td>
                    <td className="py-3 px-4 text-emerald-800 dark:text-emerald-300">
                      {row.pros}
                    </td>
                    <td className="py-3 px-4 text-amber-800 dark:text-amber-400">
                      {row.cons}
                    </td>
                    <td className="py-3 px-4 font-medium text-charcoal-700 dark:text-cream-200">
                      {row.bestFor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
