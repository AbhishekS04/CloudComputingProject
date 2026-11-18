import React from 'react';

/**
 * IsoPrismNode
 * 3D isometric hexagonal service node matching designed-to-scale reference:
 * - Proper flat-faceted hexagonal prism (6 straight edges, NOT bezier curves)
 * - Warm peach gradient top face
 * - Darker side walls with proper perspective
 * - Lock/shield icon centered on top face
 * - Bold two-line title on top face
 * - Green status dot on right vertex
 * - Optional satellite badge above
 *
 * Uses unique IDs keyed by title to avoid SVG filter/gradient conflicts.
 */
export default function IsoPrismNode({
  x = 0,
  y = 0,
  title = 'Load Balancer',
  icon = '🛡️',
  topBadge = null,
  colorScheme = 'peach',
  onClick = null,
  isSelected = false,
}) {
  const uid = title.replace(/\W/g, '');

  const palette = {
    peach: {
      top: '#FFDDBC',
      topLight: '#FFEDD5',
      sideL: '#F5BA7A',
      sideR: '#E8A05E',
      border: '#252820',
    },
    sage: {
      top: '#C5E0CC',
      topLight: '#DCF0E0',
      sideL: '#8FC49A',
      sideR: '#6AAF7A',
      border: '#252820',
    },
    amber: {
      top: '#FDE68A',
      topLight: '#FEF3C7',
      sideL: '#FCD34D',
      sideR: '#F59E0B',
      border: '#252820',
    },
    blue: {
      top: '#BFDBFE',
      topLight: '#DBEAFE',
      sideL: '#93C5FD',
      sideR: '#60A5FA',
      border: '#252820',
    },
  };
  const c = palette[colorScheme] || palette.peach;

  // Hexagonal prism geometry
  // Top face: flat isometric hexagon, wider than tall
  // 6 vertices of the top face (clockwise from top):
  //   top:         (0, -32)
  //   top-right:   (48, -16)
  //   bot-right:   (48, 16)
  //   bottom:      (0, 32)
  //   bot-left:    (-48, 16)
  //   top-left:    (-48, -16)
  const H = 40; // extrusion height

  const topFace = '0,-32 48,-16 48,16 0,32 -48,16 -48,-16';

  // We only see 3 side faces in isometric view: bottom, bottom-right, bottom-left
  // Left wall: top-left → bottom → their extruded counterparts
  const wallLeft = `
    -48,-16 -48,16 0,32
    0,${32 + H} -48,${16 + H} -48,${-16 + H}
  `;
  // Bottom-right wall
  const wallRight = `
    0,32 48,16
    48,${16 + H} 0,${32 + H}
  `;
  // Front bottom point (small triangle) — not visible in this hex orientation
  // Actually for isometric hex, we see: left wall, bottom wall, right wall
  // Let's draw it as 2 visible walls:
  // Left wall: from top-left vertex down to bottom vertex, then extruded
  // Right wall: from bottom vertex to top-right vertex, then extruded

  const titleLines = title.split(' ');
  const line1 = titleLines[0] || '';
  const line2 = titleLines.slice(1).join(' ');

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer"
      onClick={onClick}
    >
      <defs>
        <filter id={`pn-sh-${uid}`} x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#252820" floodOpacity="0.12" />
        </filter>
        <linearGradient id={`pn-top-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.topLight} />
          <stop offset="100%" stopColor={c.top} />
        </linearGradient>
      </defs>

      <g filter={`url(#pn-sh-${uid})`}>
        {/* Left extruded wall */}
        <polygon
          points={`-48,-16 0,32 0,${32 + H} -48,${-16 + H}`}
          fill={c.sideL}
          stroke={c.border}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Right extruded wall */}
        <polygon
          points={`0,32 48,16 48,${16 + H} 0,${32 + H}`}
          fill={c.sideR}
          stroke={c.border}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Bottom extruded wall (front edge only visible part below bottom vertex) */}
        {/* This covers the bottom-left and bottom-right wall meeting at bottom vertex */}

        {/* Top hexagonal face */}
        <polygon
          points={topFace}
          fill={`url(#pn-top-${uid})`}
          stroke={c.border}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Inner highlight */}
        <polygon
          points="0,-26 42,-13 42,13 0,26 -42,13 -42,-13"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1"
          opacity="0.5"
        />
      </g>

      {/* Green status dot on right vertex */}
      <circle
        cx="52"
        cy="16"
        r="5"
        fill="#10B981"
        stroke="#FFFFFF"
        strokeWidth="2"
      />

      {/* Center content on top face */}
      {React.isValidElement(icon) ? (
        <foreignObject x="-9" y="-13" width="18" height="18" className="overflow-visible pointer-events-none">
          {icon}
        </foreignObject>
      ) : (
        <text
          x="0"
          y="-4"
          textAnchor="middle"
          fontSize="18"
          className="select-none"
        >
          {icon}
        </text>
      )}

      <text
        x="0"
        y="14"
        textAnchor="middle"
        fill="#252820"
        fontSize="13"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.3"
      >
        {line1}
      </text>
      {line2 && (
        <text
          x="0"
          y="28"
          textAnchor="middle"
          fill="#252820"
          fontSize="12"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.3"
        >
          {line2}
        </text>
      )}

      {/* Satellite badge above */}
      {topBadge && (
        <g transform="translate(0, -54)">
          <rect
            x={-6 - (topBadge.text.length * 3.5)}
            y="-12"
            width={12 + topBadge.text.length * 7}
            height="24"
            rx="12"
            fill="#FFFFFF"
            stroke="#252820"
            strokeWidth="2.2"
          />
          {topBadge.icon && React.isValidElement(topBadge.icon) ? (
            <foreignObject x={-topBadge.text.length * 3.5 - 2} y="-7" width="14" height="14">
              {topBadge.icon}
            </foreignObject>
          ) : topBadge.icon ? (
            <text x={-topBadge.text.length * 3.2} y="4" fontSize="11" className="select-none">
              {topBadge.icon}
            </text>
          ) : null}
          <text
            x={12}
            y="3.5"
            textAnchor="middle"
            fill="#252820"
            fontSize="10"
            fontWeight="700"
            fontFamily="'SFMono-Regular', 'Consolas', monospace"
          >
            {topBadge.text}
          </text>
        </g>
      )}
    </g>
  );
}
