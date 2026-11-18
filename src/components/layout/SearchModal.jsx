import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight } from 'reicon-react';
import { COURSE_MODULES } from '../../data/courseData';

export default function SearchModal({ isOpen, onClose, onSelectLesson }) {
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener: Escape to close, Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle modal
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Flatten all lessons
  const allLessons = COURSE_MODULES.flatMap((m) =>
    (m.lessons || []).map((l) => ({
      ...l,
      moduleNumber: m.number,
      moduleTitle: m.title
    }))
  );

  const filtered = allLessons.filter(
    (l) =>
      !query ||
      l.title.toLowerCase().includes(query.toLowerCase()) ||
      (l.subtitle && l.subtitle.toLowerCase().includes(query.toLowerCase())) ||
      l.moduleTitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl max-w-xl w-full shadow-modal overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-[#DDD6C6] dark:border-charcoal-700">
          <Search aria-hidden="true" size={20} className="text-charcoal-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search lessons, concepts, algorithms (e.g. DNS, Layer 7, Round Robin)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm font-medium text-charcoal-900 dark:text-cream-100 placeholder:text-charcoal-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            aria-label="Close search modal"
            className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-700"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#DDD6C6]/40 dark:divide-charcoal-700/40 text-xs">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-charcoal-400">
              No matching lessons or concepts found.
            </div>
          ) : (
            filtered.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => {
                  onSelectLesson(lesson.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#EBE6DA]/60 dark:hover:bg-charcoal-800 text-left transition-colors group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] text-charcoal-400">
                      {lesson.moduleNumber}. {lesson.moduleTitle}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-white dark:bg-charcoal-700 border border-[#DDD6C6] text-[9px] font-mono">
                      {lesson.level}
                    </span>
                  </div>
                  <h4 className="font-bold text-charcoal-900 dark:text-cream-100 group-hover:text-emerald-700 transition-colors">
                    {lesson.title}
                  </h4>
                  {lesson.subtitle && (
                    <p className="text-[11px] text-charcoal-500 line-clamp-1">{lesson.subtitle}</p>
                  )}
                </div>
                <ArrowRight aria-hidden="true" size={16} className="text-charcoal-300 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#EBE6DA]/50 dark:bg-charcoal-800/50 border-t border-[#DDD6C6] dark:border-charcoal-700 flex items-center justify-between text-[11px] font-mono text-charcoal-400">
          <span>Navigate with arrow keys</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
