import React from 'react';
import { motion } from 'framer-motion';

export default function StepScrubber({ steps, currentStepIndex, onSelectStep }) {
  const currentStep = steps[currentStepIndex];

  return (
    <div className="bg-[#FAF8F2] dark:bg-charcoal-900 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 p-4 shadow-subtle">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-cream-400">
          In This Lesson
        </span>
        <span className="font-mono text-xs font-bold text-charcoal-800 dark:text-cream-200">
          Step {currentStepIndex + 1} of {steps.length}
        </span>
      </div>

      {/* Stepper Timeline */}
      <div className="relative flex items-center justify-between w-full pt-2 pb-1 overflow-x-auto">
        {/* Background connector line */}
        <div className="absolute top-[22px] left-6 right-6 h-0.5 bg-[#DDD6C6] dark:bg-charcoal-700 -z-0" />

        {/* Progress fill line */}
        <div
          className="absolute top-[22px] left-6 h-0.5 bg-emerald-600 dark:bg-emerald-500 transition-all duration-300 -z-0"
          style={{ width: `${(currentStepIndex / (steps.length - 1 || 1)) * 92}%` }}
        />

        {steps.map((s, idx) => {
          const isActive = idx === currentStepIndex;
          const isPassed = idx < currentStepIndex;

          return (
            <button
              key={s.stepNumber}
              onClick={() => onSelectStep(idx)}
              className="group relative z-10 flex flex-col items-center min-w-[64px] focus:outline-none"
            >
              {/* Step Circle */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#C5E5C9] text-[#1E3A24] border-2 border-[#1E3A24] scale-110 shadow-sm ring-4 ring-[#C5E5C9]/40'
                    : isPassed
                    ? 'bg-emerald-600 text-white border-2 border-emerald-600'
                    : 'bg-[#FAF8F2] dark:bg-charcoal-800 text-charcoal-400 border-2 border-[#DDD6C6] group-hover:border-charcoal-400'
                }`}
              >
                {s.stepNumber}
              </div>

              {/* Step Name */}
              <span
                className={`text-[10px] mt-2 whitespace-nowrap font-medium transition-colors ${
                  isActive
                    ? 'font-bold text-charcoal-900 dark:text-cream-100 underline decoration-[#C5E5C9] decoration-2'
                    : isPassed
                    ? 'text-charcoal-600 dark:text-cream-300'
                    : 'text-charcoal-400 dark:text-charcoal-500 group-hover:text-charcoal-700'
                }`}
              >
                {s.title.split(' (')[0].split(' ')[0]} {s.title.split(' (')[0].split(' ')[1] || ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
