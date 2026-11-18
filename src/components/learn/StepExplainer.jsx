import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Lightbulb, CheckSquare, Stop } from 'reicon-react';

export default function StepExplainer({
  step,
  stepIndex,
  totalSteps,
  nextStepTitle,
  onPrev,
  onNext,
  whatYouLearn = []
}) {
  const [checkedItems, setCheckedItems] = useState({ 0: true });

  const toggleCheck = (idx) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="w-full lg:w-[360px] bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl p-5 shadow-subtle flex flex-col justify-between shrink-0 h-full max-h-[820px] overflow-y-auto">
      <div className="space-y-4">
        {/* Step Badge & Tag Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DDD6C6] dark:border-charcoal-700">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-500 dark:text-cream-400">
            Step {step.stepNumber} / {totalSteps}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cream-200 border border-[#DDD6C6] dark:border-charcoal-700 uppercase">
            {step.tag}
          </span>
        </div>

        {/* Step Title */}
        <h3 className="text-base font-extrabold text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
          {step.title}
        </h3>

        {/* Editorial Text */}
        <p className="text-xs text-charcoal-700 dark:text-cream-300 leading-relaxed font-sans">
          {step.explanation}
        </p>

        {/* 💡 GOOD TO KNOW Callout */}
        {step.goodToKnow && (
          <div className="p-3.5 rounded-xl bg-[#EBE6DA]/60 dark:bg-charcoal-800/80 border border-[#DDD6C6] dark:border-charcoal-700 space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">
              <Lightbulb aria-hidden="true" size={14} />
              <span>Good to Know</span>
            </div>
            <p className="text-[11px] text-charcoal-600 dark:text-cream-300 leading-relaxed">
              {step.goodToKnow}
            </p>
          </div>
        )}

        {/* WHAT CHANGED Diff Block */}
        {step.whatChanged && step.whatChanged.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="font-mono text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">
              What Changed
            </span>
            <div className="p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 space-y-1 font-mono text-xs">
              {step.whatChanged.map((item, i) => (
                <div key={i} className="text-emerald-700 dark:text-emerald-400 font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={stepIndex === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-700 dark:text-cream-200 text-xs font-semibold hover:bg-cream-100 disabled:opacity-40 transition-colors shadow-xs"
          >
            <ArrowLeft aria-hidden="true" size={14} />
            <span>Back</span>
          </button>

          <button
            onClick={onNext}
            disabled={stepIndex === totalSteps - 1}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C5E5C9] hover:bg-[#B4DDB9] text-[#1E3A24] border border-[#A3D2A7] text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
          >
            <span>{nextStepTitle ? `Next: ${nextStepTitle}` : 'Next Step'}</span>
            <ArrowRight aria-hidden="true" size={14} />
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="text-[10px] text-center font-mono text-charcoal-400 pt-0.5">
          [ ← ] [ → ] step • [ R ] replay • [ Space ] pause
        </div>
      </div>

      {/* YOU'LL LEARN Checklist */}
      {whatYouLearn && whatYouLearn.length > 0 && (
        <div className="pt-4 mt-4 border-t border-[#DDD6C6] dark:border-charcoal-700 space-y-2">
          <span className="font-mono text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">
            You'll Learn
          </span>
          <div className="space-y-1.5 text-xs">
            {whatYouLearn.map((item, i) => {
              const isChecked = !!checkedItems[i];
              return (
                <div
                  key={i}
                  onClick={() => toggleCheck(i)}
                  className="flex items-start gap-2 cursor-pointer group"
                >
                  <div className="mt-0.5 text-emerald-600">
                    {isChecked ? (
                      <CheckSquare aria-hidden="true" size={14} weight="Filled" />
                    ) : (
                      <Stop aria-hidden="true" size={14} className="text-charcoal-400" />
                    )}
                  </div>
                  <span
                    className={`text-[11px] leading-snug ${
                      isChecked
                        ? 'text-charcoal-800 dark:text-cream-200 font-medium'
                        : 'text-charcoal-500 group-hover:text-charcoal-800'
                    }`}
                  >
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
