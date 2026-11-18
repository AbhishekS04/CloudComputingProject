import React from 'react';
import { motion } from 'framer-motion';

/**
 * IsoConnectionPath
 * Clean stepped network paths matching designed-to-scale reference:
 * - Solid 2.2px black lines with round joins
 * - Proper arrowheads at endpoints
 * - Red square tokens (■) at path corners/bends
 * - Green circle junction dots
 * - Animated circular traffic packets
 * - Attached satellite badge pills
 */
export default function IsoConnectionPath({
  points = [],
  arrow = 'end',
  color = '#252820',
  strokeWidth = 2.2,
  dashed = false,
  tokens = [],
  junctionDot = null, // { index: 2, color: "green" } – green circle at a junction point
  animatedPacket = null,
  badge = null,
}) {
  if (points.length < 2) return null;

  // Build SVG path
  const pathD = points
    .map((pt, i) => (i === 0 ? `M${pt[0]} ${pt[1]}` : `L${pt[0]} ${pt[1]}`))
    .join(' ');

  const startPt = points[0];
  const endPt = points[points.length - 1];

  // Arrow helper
  const renderArrow = (tip, prev, fillColor) => {
    const angle = (Math.atan2(tip[1] - prev[1], tip[0] - prev[0]) * 180) / Math.PI;
    return (
      <g transform={`translate(${tip[0]}, ${tip[1]})`}>
        <polygon
          points="-9,-4.5 0,0 -9,4.5"
          fill={fillColor}
          transform={`rotate(${angle})`}
        />
      </g>
    );
  };

  return (
    <g className="pointer-events-none select-none">
      {/* Main path line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? '6 4' : undefined}
      />

      {/* Arrowheads */}
      {(arrow === 'end' || arrow === 'both') &&
        renderArrow(endPt, points[points.length - 2], color)}
      {(arrow === 'start' || arrow === 'both') &&
        renderArrow(startPt, points[1], color)}

      {/* Red square tokens at path corners */}
      {tokens.map((token, idx) => {
        const pt = points[token.index];
        if (!pt) return null;
        const fillColor =
          token.color === 'red'
            ? '#EF4444'
            : token.color === 'green'
            ? '#10B981'
            : '#F59E0B';

        return token.type === 'circle' ? (
          <circle
            key={idx}
            cx={pt[0]}
            cy={pt[1]}
            r="5"
            fill={fillColor}
            stroke="#252820"
            strokeWidth="2"
          />
        ) : (
          <rect
            key={idx}
            x={pt[0] - 5}
            y={pt[1] - 5}
            width="10"
            height="10"
            rx="1.5"
            fill={fillColor}
            stroke="#252820"
            strokeWidth="2"
          />
        );
      })}

      {/* Green junction dot */}
      {junctionDot && points[junctionDot.index] && (
        <circle
          cx={points[junctionDot.index][0]}
          cy={points[junctionDot.index][1]}
          r="5"
          fill={junctionDot.color === 'green' ? '#10B981' : '#3B82F6'}
          stroke="#FFFFFF"
          strokeWidth="2"
        />
      )}

      {/* Animated traffic packet */}
      {animatedPacket && (
        <motion.circle
          r="5"
          fill={
            animatedPacket.color === 'red'
              ? '#EF4444'
              : animatedPacket.color === 'blue'
              ? '#3B82F6'
              : animatedPacket.color === 'amber'
              ? '#F59E0B'
              : '#10B981'
          }
          stroke="#252820"
          strokeWidth="1.5"
          initial={{ cx: startPt[0], cy: startPt[1] }}
          animate={{
            cx: points.map((p) => p[0]),
            cy: points.map((p) => p[1]),
          }}
          transition={{
            repeat: Infinity,
            duration: animatedPacket.duration || 2,
            ease: 'linear',
            delay: animatedPacket.delay || 0,
          }}
        />
      )}

      {/* Satellite badge */}
      {badge && (
        <g transform={`translate(${badge.x}, ${badge.y})`}>
          <rect
            x={-(badge.text.length * 3.5 + 12)}
            y="-12"
            width={badge.text.length * 7 + 24}
            height="24"
            rx="12"
            fill={badge.color === 'amber' ? '#FED7AA' : '#FFFFFF'}
            stroke="#252820"
            strokeWidth="2.2"
          />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fill="#252820"
            fontSize="10"
            fontWeight="700"
            fontFamily="'SFMono-Regular', 'Consolas', monospace"
          >
            {badge.text}
          </text>
        </g>
      )}
    </g>
  );
}
