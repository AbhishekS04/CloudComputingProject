import React from 'react';

/**
 * IsoCylinderNode
 * 3D isometric database cylinder matching designed-to-scale reference:
 * - Proper cylinder with ellipse top cap and straight vertical sides
 * - Lavender/purple gradient
 * - Person silhouette icon (👤) centered on front face
 * - Right satellite "users table" pill
 * - Top green code/hash pill
 *
 * Unique IDs keyed on tableLabel to avoid SVG conflicts.
 */
export default function IsoCylinderNode({
  x = 0,
  y = 0,
  icon = '👤',
  tableLabel = 'users table',
  codePill = null,
  onClick = null,
  colorScheme = 'purple',
}) {
  const uid = (tableLabel || 'cyl').replace(/\W/g, '');

  const palette = {
    purple: {
      top: '#E9E0FE',
      body: '#D8CCFE',
      bodyDark: '#C4B5FD',
      border: '#252820',
    },
    blue: {
      top: '#DBEAFE',
      body: '#BFDBFE',
      bodyDark: '#93C5FD',
      border: '#252820',
    },
  };
  const c = palette[colorScheme] || palette.purple;

  // Cylinder dimensions
  const W = 42; // ellipse rx
  const H = 20; // ellipse ry
  const DEPTH = 56; // cylinder height

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer"
      onClick={onClick}
    >
      <defs>
        <filter id={`cy-sh-${uid}`} x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#252820" floodOpacity="0.12" />
        </filter>
        <linearGradient id={`cy-body-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c.body} />
          <stop offset="70%" stopColor={c.body} />
          <stop offset="100%" stopColor={c.bodyDark} />
        </linearGradient>
      </defs>

      <g filter={`url(#cy-sh-${uid})`}>
        {/* Cylinder body: two vertical lines + bottom ellipse arc */}
        <path
          d={`
            M-${W} 0
            L-${W} ${DEPTH}
            A${W} ${H} 0 0 0 ${W} ${DEPTH}
            L${W} 0
            Z
          `}
          fill={`url(#cy-body-${uid})`}
          stroke={c.border}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Top ellipse cap */}
        <ellipse
          cx="0"
          cy="0"
          rx={W}
          ry={H}
          fill={c.top}
          stroke={c.border}
          strokeWidth="2.2"
        />

        {/* Inner highlight ring on top */}
        <ellipse
          cx="0"
          cy="0"
          rx={W - 4}
          ry={H - 3}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1"
          opacity="0.7"
        />
      </g>

      {/* Icon on cylinder face */}
      <text
        x="0"
        y={DEPTH / 2 + 6}
        textAnchor="middle"
        fontSize="20"
        className="select-none"
      >
        {icon}
      </text>

      {/* Right satellite pill: "🗄️ users table" */}
      {tableLabel && (
        <g transform={`translate(${W + 14}, ${DEPTH / 2 - 2})`}>
          <rect
            x="0"
            y="-12"
            width={tableLabel.length * 7.2 + 28}
            height="24"
            rx="12"
            fill="#FFFFFF"
            stroke="#252820"
            strokeWidth="2.2"
          />
          <text x="10" y="4" fontSize="11" className="select-none">
            🗄️
          </text>
          <text
            x={tableLabel.length * 3.6 + 24}
            y="3.5"
            textAnchor="middle"
            fill="#252820"
            fontSize="10.5"
            fontWeight="700"
            fontFamily="'SFMono-Regular', 'Consolas', monospace"
          >
            {tableLabel}
          </text>
        </g>
      )}

      {/* Top code/hash pill (green) */}
      {codePill && (
        <g transform="translate(10, -32)">
          <rect
            x="-4"
            y="-12"
            width={codePill.length * 6.4 + 24}
            height="24"
            rx="12"
            fill="#DCFCE7"
            stroke="#252820"
            strokeWidth="2.2"
          />
          <text
            x="8"
            y="4"
            fontSize="11"
            fontWeight="800"
            fill="#166534"
            className="select-none"
          >
            #
          </text>
          <text
            x={codePill.length * 3.2 + 20}
            y="3.5"
            textAnchor="middle"
            fill="#166534"
            fontSize="9.5"
            fontWeight="700"
            fontFamily="'SFMono-Regular', 'Consolas', monospace"
          >
            {codePill}
          </text>
        </g>
      )}
    </g>
  );
}
