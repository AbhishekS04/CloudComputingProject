import React from 'react';
import SystemDesignNavbar from '../components/layout/SystemDesignNavbar';
import Visualizer from '../components/visualizer/Visualizer';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';

export default function MainPlatformPage() {
  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-clip bg-[#FAF7F0] dark:bg-[#121212] text-charcoal-800 dark:text-cream-100 font-sans transition-colors duration-200">
      {/* 1. Pinned Top Progressive Blur Navigation */}
      <SystemDesignNavbar />

      {/* 2. Centered Visualizer Hero Stage */}
      <main className="flex-1 w-full flex flex-col items-center justify-start px-3 sm:px-6 pt-3 sm:pt-5 pb-16 sm:pb-20">
        <div className="w-full max-w-[1380px] mx-auto">
          <Visualizer />
        </div>
      </main>

      {/* 3. Matching Bottom Progressive Blur */}
      <ProgressiveBlur className="fixed bottom-0 z-30" height="64px" position="bottom" />
    </div>
  );
}
