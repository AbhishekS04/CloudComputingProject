import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder, CheckCircle, ChevronRight as RightIcon } from 'lucide-react';

export default function CourseSidebar({ modules, activeLessonId, onSelectLesson }) {
  // Default open module 1
  const [openModules, setOpenModules] = useState({ 'mod-1': true, 'mod-3': true });

  const toggleModule = (modId) => {
    setOpenModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedLessons = 2;

  return (
    <aside className="w-64 bg-[#FAF8F2] dark:bg-charcoal-900 border-r border-[#DDD6C6] dark:border-charcoal-700 flex flex-col justify-between shrink-0 h-full overflow-hidden select-none">
      {/* 1. Header */}
      <div className="p-4 border-b border-[#DDD6C6] dark:border-charcoal-700 flex items-center justify-between">
        <span className="font-extrabold text-sm text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
          Course
        </span>
        <span className="font-mono text-xs text-charcoal-500 dark:text-cream-400">
          {totalLessons} lessons
        </span>
      </div>

      {/* 2. Scrollable Module & Lesson Tree */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {modules.map((mod) => {
          const isOpen = !!openModules[mod.id];

          return (
            <div key={mod.id} className="space-y-1">
              {/* Module Accordion Header */}
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-bold text-charcoal-800 dark:text-cream-200 hover:bg-[#EBE6DA]/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-charcoal-400">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>
                  <span className="font-mono text-[11px] text-charcoal-500">{mod.number}.</span>
                  <span className="truncate">{mod.title}</span>
                </div>
                <span className="font-mono text-[10px] text-charcoal-400">
                  {mod.completedCount || 0}/{mod.lessonCount || mod.lessons.length}
                </span>
              </button>

              {/* Lessons List inside Module */}
              {isOpen && mod.lessons && (
                <div className="pl-6 space-y-1 pt-0.5">
                  {mod.lessons.map((lesson) => {
                    const isActive = lesson.id === activeLessonId;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => onSelectLesson(lesson.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition-all ${
                          isActive
                            ? 'bg-[#C5E5C9] text-[#1E3A24] font-bold shadow-xs border border-[#A3D2A7]'
                            : 'text-charcoal-600 dark:text-cream-300 hover:bg-[#EBE6DA]/50 hover:text-charcoal-900'
                        }`}
                      >
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1E3A24]' : 'text-charcoal-400'}`} />
                        <span className="truncate">{lesson.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Progress Footer */}
      <div className="p-4 border-t border-[#DDD6C6] dark:border-charcoal-700 bg-[#FAF8F2] dark:bg-charcoal-900">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-mono text-[11px] font-bold text-charcoal-500 uppercase">Progress</span>
          <span className="font-mono text-xs font-bold text-charcoal-800 dark:text-cream-200">
            {completedLessons} / {totalLessons} &gt;
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
