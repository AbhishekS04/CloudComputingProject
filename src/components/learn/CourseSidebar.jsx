import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  File,
  SidebarLeft,
  SidebarLeft2,
  BookOpen
} from 'reicon-react';

export default function CourseSidebar({
  modules,
  activeLessonId,
  onSelectLesson,
  isCollapsed = false,
  onToggleCollapse
}) {
  // Default open module 1
  const [openModules, setOpenModules] = useState({ 'mod-1': true, 'mod-3': true });

  const toggleModule = (modId) => {
    setOpenModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedLessons = 2;

  // Collapsed compact rail view
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-[#FAF8F2] dark:bg-charcoal-900 border-r border-[#DDD6C6] dark:border-charcoal-700 flex flex-col items-center justify-between py-3 shrink-0 h-full select-none transition-all duration-200">
        <div className="flex flex-col items-center gap-3">
          {/* Expand Button */}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-700 dark:text-cream-200 hover:bg-[#EBE6DA] transition-colors shadow-2xs"
            title="Expand Curriculum Sidebar"
            aria-label="Expand Curriculum Sidebar"
          >
            <SidebarLeft2 className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="w-6 h-px bg-[#DDD6C6] dark:bg-charcoal-700 my-1" />

          {/* Module Number Chips */}
          <div className="flex flex-col items-center gap-2">
            {modules.map((mod) => {
              const hasActiveLesson = mod.lessons?.some((l) => l.id === activeLessonId);

              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    if (onToggleCollapse) onToggleCollapse();
                    if (!openModules[mod.id]) toggleModule(mod.id);
                  }}
                  className={`w-8 h-8 rounded-xl font-mono text-[11px] font-bold flex items-center justify-center transition-all ${
                    hasActiveLesson
                      ? 'bg-[#1E3A24] dark:bg-cream-100 text-white dark:text-charcoal-900 shadow-xs'
                      : 'bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300 hover:border-charcoal-400'
                  }`}
                  title={`${mod.number}. ${mod.title}`}
                >
                  {mod.number}
                </button>
              );
            })}
          </div>
        </div>

        {/* Minimal Progress Chip */}
        <div
          className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold flex items-center justify-center"
          title={`${completedLessons}/${totalLessons} Completed`}
        >
          {Math.round((completedLessons / totalLessons) * 100)}%
        </div>
      </aside>
    );
  }

  // Expanded normal sidebar view
  return (
    <aside className="w-64 bg-[#FAF8F2] dark:bg-charcoal-900 border-r border-[#DDD6C6] dark:border-charcoal-700 flex flex-col justify-between shrink-0 h-full overflow-hidden select-none transition-all duration-200">
      {/* 1. Header with Collapse Toggle */}
      <div className="p-3.5 px-4 border-b border-[#DDD6C6] dark:border-charcoal-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span className="font-extrabold text-sm text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
            Curriculum
          </span>
          <span className="font-mono text-[11px] text-charcoal-400">
            ({totalLessons})
          </span>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-800 hover:bg-[#EBE6DA]/60 transition-colors"
            title="Collapse Sidebar"
            aria-label="Collapse Sidebar"
          >
            <SidebarLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* 2. Scrollable Module & Lesson Tree */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {modules.map((mod) => {
          const isOpen = !!openModules[mod.id];

          return (
            <div key={mod.id} className="space-y-1">
              {/* Module Accordion Header */}
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-bold text-charcoal-800 dark:text-cream-200 hover:bg-[#EBE6DA]/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <motion.span
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    className="text-charcoal-400 shrink-0 inline-flex"
                  >
                    <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                  </motion.span>
                  <span className="font-mono text-[11px] text-charcoal-500 shrink-0">{mod.number}.</span>
                  <span className="truncate">{mod.title}</span>
                </div>
                <span className="font-mono text-[10px] text-charcoal-400 shrink-0 ml-1">
                  {mod.completedCount || 0}/{mod.lessonCount || mod.lessons.length}
                </span>
              </button>

              {/* Smooth Expanding Lessons List */}
              <AnimatePresence initial={false}>
                {isOpen && mod.lessons && (
                  <motion.div
                    key={`${mod.id}-lessons`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { type: 'spring', stiffness: 300, damping: 28 },
                      opacity: { duration: 0.16 },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="pl-5 space-y-0.5 pt-0.5">
                      {mod.lessons.map((lesson) => {
                        const isActive = lesson.id === activeLessonId;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => onSelectLesson(lesson.id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-left transition-all ${
                              isActive
                                ? 'bg-[#C5E5C9] text-[#1E3A24] font-bold shadow-xs border border-[#A3D2A7]'
                                : 'text-charcoal-600 dark:text-cream-300 hover:bg-[#EBE6DA]/50 hover:text-charcoal-900'
                            }`}
                          >
                            <File className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1E3A24]' : 'text-charcoal-400'}`} aria-hidden="true" />
                            <span className="truncate">{lesson.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* 3. Progress Footer */}
      <div className="p-3 px-4 border-t border-[#DDD6C6] dark:border-charcoal-700 bg-[#FAF8F2] dark:bg-charcoal-900">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-mono text-[10px] font-bold text-charcoal-500 uppercase tracking-wider">Progress</span>
          <span className="font-mono text-[11px] font-bold text-charcoal-800 dark:text-cream-200">
            {completedLessons} of {totalLessons} completed
          </span>
        </div>
        <div className="w-full bg-[#EBE6DA] dark:bg-charcoal-700 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-300"
            style={{ width: `${(completedLessons / totalLessons) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
