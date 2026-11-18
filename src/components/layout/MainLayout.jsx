import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F2EA] dark:bg-charcoal-950 text-charcoal-800 dark:text-cream-100 font-sans">
      {/* Fixed Collapsible Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <Topbar />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
