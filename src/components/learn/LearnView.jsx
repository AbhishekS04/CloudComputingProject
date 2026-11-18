import React, { useState, useEffect } from 'react';
import InteractiveDiagram from './InteractiveDiagram';
import TimingStrip from './TimingStrip';
import StepScrubber from './StepScrubber';
import StepExplainer from './StepExplainer';
import { Clock, BarChart, Layers, ChevronRight } from 'lucide-react';

export default function LearnView({ lesson, onCompleteLesson }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(1); // Default to Step 2 (just like the screenshot!)
  const [isPlaying, setIsPlaying] = useState(false);

  const steps = lesson.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0];
  const nextStep = steps[currentStepIndex + 1];

  // Auto-play stepper ticker
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2800);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // Keyboard navigation: ArrowLeft, ArrowRight, Space (play/pause), 'r' (replay)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.max(0, prev - 1));
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setCurrentStepIndex(0);
        setIsPlaying(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps.length]);

  const handleReplay = () => {
    setCurrentStepIndex(0);
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
      {/* Left/Center Main Column */}
      <div className="flex-1 min-w-0 space-y-4 w-full">
        {/* Lesson Header (Matching the screenshot exactly) */}
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-charcoal-500 font-mono mb-1">
            <span>01. Foundations</span>
            <ChevronRight className="w-3 h-3 text-charcoal-400" />
            <span className="text-charcoal-700 dark:text-cream-300 font-medium">Lesson 1 of 4</span>
          </div>

          {/* Title & Metadata chips */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
              {lesson.title}
            </h1>

            {/* Badges in the screenshot: [ ⏱ 10 min ] [ 📶 Beginner ] [ 📑 10 steps ] */}
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 font-mono text-[11px] text-charcoal-700 dark:text-cream-200 shadow-2xs">
                <Clock className="w-3 h-3 text-charcoal-500" />
                <span>{lesson.duration || '10 min'}</span>
              </span>

              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 font-mono text-[11px] text-charcoal-700 dark:text-cream-200 shadow-2xs">
                <BarChart className="w-3 h-3 text-emerald-600" />
                <span>{lesson.level || 'Beginner'}</span>
              </span>

              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#EBE6DA] dark:bg-charcoal-700 border border-[#DDD6C6] font-mono text-[11px] font-bold text-charcoal-800 dark:text-cream-100 shadow-2xs">
                <Layers className="w-3 h-3 text-charcoal-600" />
                <span>{steps.length} steps</span>
              </span>
            </div>
          </div>

          {/* Subtitle description */}
          <p className="text-xs text-charcoal-500 dark:text-cream-400 mt-1.5 font-sans leading-relaxed">
            {lesson.subtitle}
          </p>
        </div>

        {/* Latency Timing Strip */}
        <TimingStrip
          timings={currentStep.timings || {}}
          onReplay={handleReplay}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
        />

        {/* Central Isometric Interactive Diagram */}
        <InteractiveDiagram
          currentStep={currentStep}
          activeLesson={lesson}
        />

        {/* Bottom Stepper Timeline */}
        <StepScrubber
          steps={steps}
          currentStepIndex={currentStepIndex}
          onSelectStep={(idx) => {
            setCurrentStepIndex(idx);
            setIsPlaying(false);
          }}
        />
      </div>

      {/* Right Sidebar: Step Explainer & Checklist */}
      <StepExplainer
        step={currentStep}
        stepIndex={currentStepIndex}
        totalSteps={steps.length}
        nextStepTitle={nextStep ? nextStep.title : null}
        onPrev={handlePrev}
        onNext={handleNext}
        whatYouLearn={lesson.whatYouLearn}
      />
    </div>
  );
}
