import React from 'react';

/**
 * IsoGridBackground
 * Diamond-pattern isometric grid paper matching the warm cream paper
 * from the designed-to-scale reference.
 * Uses a unique pattern ID to avoid SVG conflicts.
 */
export default function IsoGridBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="iso-grid-bg"
          width="56"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          {/* Full isometric diamond tile */}
          <path
            d="M28 0 L56 16 L28 32 L0 16Z"
            fill="none"
            stroke="#DDD6C6"
            strokeWidth="0.7"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#iso-grid-bg)" />
    </svg>
  );
}
