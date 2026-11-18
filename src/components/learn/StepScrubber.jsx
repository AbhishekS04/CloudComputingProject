import React from 'react';
import { ChevronLeft, ChevronRight, Check } from 'reicon-react';

export default function StepScrubber({ steps, currentStepIndex, onSelectStep }) {
  const currentStep = steps[currentStepIndex] || steps[0];

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      onSelectStep(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      onSelectStep(currentStepIndex + 1);
    }
  };

  return (
    <div className="bg-[#FAF8F2] dark:bg-charcoal-900 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 p-3 px-4 shadow-subtle select-none">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#DDD6C6]/60 dark:border-charcoal-700/60 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-[#EBE6DA] dark:bg-charcoal-800 font-mono text-[10px] font-bold text-charcoal-600 dark:text-cream-300 uppercase tracking-wider shrink-0">
            Hop {currentStepIndex + 1}/{steps.length}
          </span>
          <span className="font-bold text-charcoal-900 dark:text-cream-100 truncate">
            {currentStep?.title || 'Lesson Step'}
          </span>
        </div>

        {/* Mini Step Navigator */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="p-1 rounded-lg bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300 hover:bg-[#EBE6DA] disabled:opacity-30 transition-colors shadow-2xs"
            title="Previous step"
            aria-label="Previous step"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <span className="font-mono text-xs font-semibold px-1 text-charcoal-600 dark:text-cream-300">
            {currentStepIndex + 1} of {steps.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentStepIndex >= steps.length - 1}
            className="p-1 rounded-lg bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300 hover:bg-[#EBE6DA] disabled:opacity-30 transition-colors shadow-2xs"
            title="Next step"
            aria-label="Next step"
          >
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Segmented Timeline Steps */}
      <div className="flex items-center w-full py-1">
        {steps.map((s, idx) => {
          const isActive = idx === currentStepIndex;
          const isPassed = idx < currentStepIndex;
          const cleanTitle = s.title.replace(/\s*\(.*?\)/g, '');

          return (
            <div key={s.stepNumber} className="relative flex-1 flex flex-col items-center">
              {/* Connector lines before & after node */}
              {idx > 0 && (
                <div
                  className={`absolute top-3 right-1/2 left-0 h-0.5 transition-colors ${
                    isPassed || isActive ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-[#DDD6C6] dark:bg-charcoal-700'
                  }`}
                />
              )}
              {idx < steps.length - 1 && (
                <div
                  className={`absolute top-3 left-1/2 right-0 h-0.5 transition-colors ${
                    isPassed ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-[#DDD6C6] dark:border-charcoal-700'
                  }`}
                />
              )}

              {/* Node Circle */}
              <button
                onClick={() => onSelectStep(idx)}
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all focus:outline-none ${
                  isActive
                    ? 'bg-[#1E3A24] dark:bg-cream-100 text-white dark:text-charcoal-900 ring-4 ring-[#C5E5C9]/60 scale-110 shadow-xs'
                    : isPassed
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-charcoal-800 text-charcoal-500 dark:text-charcoal-400 border border-[#DDD6C6] dark:border-charcoal-700 hover:border-charcoal-400'
                }`}
                title={s.title}
              >
                {isPassed ? <Check className="w-3 h-3 stroke-[2.5]" /> : s.stepNumber}
              </button>

              {/* Step Short Title */}
              <span
                className={`text-[10px] mt-1.5 text-center px-0.5 max-w-[72px] truncate transition-colors font-medium ${
                  isActive
                    ? 'font-bold text-charcoal-900 dark:text-cream-100'
                    : isPassed
                    ? 'text-charcoal-600 dark:text-cream-300'
                    : 'text-charcoal-400 dark:text-charcoal-500'
                }`}
              >
                {cleanTitle}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
