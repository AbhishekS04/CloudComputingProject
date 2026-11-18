import React from 'react';

export default function VisualizerPage() {
  return (
    <div className="w-full h-[calc(100vh-100px)] min-h-[640px] overflow-hidden rounded-2xl border border-[#DDD6C6] shadow-subtle bg-[#f6f1e6]">
      <iframe
        src="/visualizer.html"
        title="Neo-Brutalist Isometric Load Balancer Visualizer"
        className="w-full h-full min-h-[640px] border-0 block"
      />
    </div>
  );
}
