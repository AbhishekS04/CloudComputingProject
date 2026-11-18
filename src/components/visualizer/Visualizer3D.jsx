import React from 'react';

/**
 * Visualizer3D
 * Embeds the Neo-Brutalist Isometric Load Balancer Visualizer HTML
 * directly via iframe without any code modifications.
 */
export default function Visualizer3D() {
  return (
    <div className="w-full h-full min-h-[640px] relative overflow-hidden bg-[#f6f1e6]">
      <iframe
        src="/visualizer.html"
        title="Neo-Brutalist Isometric Load Balancer Visualizer"
        className="w-full h-full min-h-[640px] border-0 block"
      />
    </div>
  );
}
