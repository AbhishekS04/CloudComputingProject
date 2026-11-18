import React from 'react';

/**
 * IsoServerNode
 * Isometric server blade chassis matching the LOADFLOW design language:
 * - Clean isometric box with 3 visible faces
 * - Dark rack slot bays on left and right faces
 * - LED status indicator on top edge
 * - Label pill below with connection count
 *
 * Unique IDs keyed on name to avoid SVG conflicts.
 */
export default function IsoServerNode({
  x = 0,
  y = 0,
  name = 'Server A',
  conns = 4,
  status = 'healthy',
  isChosen = false,
  onClick = null,
}) {
  const uid = name.replace(/\W/g, '');
  const isHealthy = status === 'healthy';
  const isFailed = status === 'failed';

  const ledColor = isHealthy ? '#10B981' : isFailed ? '#EF4444' : '#F59E0B';

  const topFill = isChosen ? '#ECFDF5' : '#F5F2EA';
  const leftFill = isChosen ? '#A7F3D0' : '#E2E0D6';
  const rightFill = isChosen ? '#6EE7B7' : '#D2CFC4';
  const border = isChosen ? '#059669' : '#252820';

  // Box geometry – isometric cuboid
  // Width: ±36 horizontal, height 22 vertical per face, depth 46
  const D = 46; // extrusion depth

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer"
      onClick={onClick}
    >
      <defs>
        <filter id={`sv-sh-${uid}`} x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#252820" floodOpacity="0.10" />
        </filter>
      </defs>

      <g filter={`url(#sv-sh-${uid})`}>
        {/* Left face */}
        <polygon
          points={`-36,-6 0,16 0,${16 + D} -36,${-6 + D}`}
          fill={leftFill}
          stroke={border}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Right face */}
        <polygon
          points={`0,16 36,-6 36,${-6 + D} 0,${16 + D}`}
          fill={rightFill}
          stroke={border}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Top face */}
        <polygon
          points="-36,-6 0,-28 36,-6 0,16"
          fill={topFill}
          stroke={border}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Rack bay slots – left face */}
        <polygon points="-32,4 -2,20 -2,15 -32,-1" fill="#334155" stroke="none" />
        <polygon points="-32,16 -2,32 -2,27 -32,11" fill="#334155" stroke="none" />
        <polygon points="-32,28 -2,44 -2,39 -32,23" fill="#334155" stroke="none" />

        {/* Rack bay slots – right face */}
        <polygon points="2,20 32,4 32,-1 2,15" fill="#1E293B" stroke="none" />
        <polygon points="2,32 32,16 32,11 2,27" fill="#1E293B" stroke="none" />
        <polygon points="2,44 32,28 32,23 2,39" fill="#1E293B" stroke="none" />

        {/* LED status indicator on front edge */}
        <circle
          cx="0"
          cy="22"
          r="3"
          fill={ledColor}
          stroke="#FFFFFF"
          strokeWidth="1"
        />
      </g>

      {/* Label pill */}
      <g transform={`translate(0, ${16 + D + 18})`}>
        <rect
          x="-44"
          y="-12"
          width="88"
          height="24"
          rx="12"
          fill={isChosen ? '#D1FAE5' : '#FFFFFF'}
          stroke={border}
          strokeWidth="2"
        />
        <text x="-30" y="4" fontSize="10" className="select-none">
          🖥️
        </text>
        <text
          x="6"
          y="3.5"
          textAnchor="middle"
          fill={isChosen ? '#065F46' : '#252820'}
          fontSize="10.5"
          fontWeight="700"
          fontFamily="'SFMono-Regular', 'Consolas', monospace"
        >
          {name}
        </text>
      </g>

      {/* Connection count pill */}
      <g transform={`translate(42, 14)`}>
        <rect
          x="0"
          y="-10"
          width="58"
          height="20"
          rx="10"
          fill={isChosen ? '#ECFDF5' : '#F5F2EA'}
          stroke={border}
          strokeWidth="1.6"
        />
        <text
          x="29"
          y="3.5"
          textAnchor="middle"
          fill={isChosen ? '#047857' : '#64748B'}
          fontSize="9.5"
          fontWeight="700"
          fontFamily="'SFMono-Regular', 'Consolas', monospace"
        >
          {conns} conn
        </text>
      </g>
    </g>
  );
}
