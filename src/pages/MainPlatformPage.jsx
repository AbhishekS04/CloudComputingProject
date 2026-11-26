import React from 'react';
import SystemDesignNavbar from '../components/layout/SystemDesignNavbar';
import Visualizer from '../components/visualizer/Visualizer';

export default function MainPlatformPage() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-[#FAF7F0] dark:bg-[#121212] text-charcoal-800 dark:text-cream-100 font-sans">
      {/* 1. Minimal Sticky System Engineering Navbar */}
      <SystemDesignNavbar />

      {/* 2. Minimal Centered Visualizer Hero Stage */}
      <main className="flex-1 w-full flex flex-col items-center justify-center px-2.5 sm:px-6 py-3 sm:py-5">
        <div className="w-full max-w-[1380px] mx-auto">
          <Visualizer />
        </div>
      </main>
    </div>
  );
}
