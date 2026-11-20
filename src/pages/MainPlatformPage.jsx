import React from 'react';
import SystemDesignNavbar from '../components/layout/SystemDesignNavbar';
import Visualizer from '../components/visualizer/Visualizer';
import StudioRightPanel from '../components/layout/StudioRightPanel';

export default function MainPlatformPage() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF7F0] dark:bg-[#121212] text-charcoal-800 dark:text-cream-100 font-sans">
      {/* 1. System Engineering Navbar */}
      <SystemDesignNavbar />

      {/* 2. Main Studio Workspace */}
      <main className="flex-1 overflow-y-auto p-3 md:p-4">
        <div className="max-w-[1900px] mx-auto flex flex-col xl:flex-row gap-4 items-start">
          {/* ========================================================
              LEFT COLUMN: The Visualizer Engine (Hero Stage)
             ======================================================== */}
          <div className="flex-1 min-w-0 w-full">
            <Visualizer />
          </div>

          {/* ========================================================
              RIGHT COLUMN: The Master Server Health & Controls Deck
             ======================================================== */}
          <div className="w-full xl:w-[390px] 2xl:w-[410px] shrink-0">
            <StudioRightPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
