import React from 'react';

/**
 * IsoLaptopStation
 * Pixel-precise isometric client workstation matching the designed-to-scale reference:
 * - Flat isometric diamond pedestal with thick cream sides
 * - Open laptop with black bezel, white screen, lavender content
 * - User pill label below
 * - Optional status/url badges
 *
 * Uses unique filter/gradient IDs keyed by userLabel to avoid SVG conflicts
 * when multiple instances are rendered.
 */
export default function IsoLaptopStation({
  x = 0,
  y = 0,
  userLabel = 'you',
  statusBadge = null,
  urlBadge = null,
  onClick = null,
}) {
  const uid = userLabel.replace(/\W/g, '');

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer"
      onClick={onClick}
    >
      <defs>
        <filter id={`ped-sh-${uid}`} x="-20%" y="-10%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#252820" floodOpacity="0.10" />
        </filter>
        <linearGradient id={`scr-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DDD6FE" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>

      {/* ───── 1. ISOMETRIC PEDESTAL ───── */}
      {/* Flat isometric diamond platform, thick extrusion */}
      <g filter={`url(#ped-sh-${uid})`}>
        {/* Front-left side wall */}
        <path
          d="M-72 0 L0 36 L0 50 L-72 14Z"
          fill="#DDD7C8"
          stroke="#252820"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Front-right side wall */}
        <path
          d="M0 36 L72 0 L72 14 L0 50Z"
          fill="#C8BFA8"
          stroke="#252820"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Top surface */}
        <path
          d="M-72 0 L0 -36 L72 0 L0 36Z"
          fill="#F0ECE0"
          stroke="#252820"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Subtle top highlight */}
        <path
          d="M-64 0 L0 -30 L64 0 L0 30Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1"
          opacity="0.5"
        />
      </g>

      {/* ───── 2. LAPTOP ───── */}
      {/* Positioned on pedestal surface */}
      <g transform="translate(0, -16)">
        {/* Keyboard base plate – isometric parallelogram */}
        <polygon
          points="-32,10 16,30 48,12 0,-8"
          fill="#FFFFFF"
          stroke="#252820"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Base plate front lip thickness */}
        <polygon
          points="-32,10 16,30 16,33 -32,13"
          fill="#DDD6C6"
          stroke="#252820"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon
          points="16,30 48,12 48,15 16,33"
          fill="#C8BFA8"
          stroke="#252820"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Keyboard area (subtle inset) */}
        <polygon
          points="-24,8 10,24 36,10 2,-6"
          fill="#EDE8DC"
          stroke="#B8B0A0"
          strokeWidth="0.6"
        />
        {/* Key rows – isometric dashes */}
        <line x1="-18" y1="6" x2="4" y2="18" stroke="#B8B0A0" strokeWidth="0.8" strokeDasharray="2.5 1.5" />
        <line x1="-12" y1="2" x2="10" y2="14" stroke="#B8B0A0" strokeWidth="0.8" strokeDasharray="2.5 1.5" />
        <line x1="-6" y1="-2" x2="16" y2="10" stroke="#B8B0A0" strokeWidth="0.8" strokeDasharray="2.5 1.5" />

        {/* Trackpad */}
        <polygon
          points="-2,18 6,22 12,18 4,14"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="0.6"
        />

        {/* Screen bezel – raised at an angle from the hinge */}
        <polygon
          points="-32,10 0,-8 0,-52 -32,-34"
          fill="#252820"
          stroke="#252820"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Screen display area (white) */}
        <polygon
          points="-29,6 -2,-10 -2,-48 -29,-32"
          fill="#FFFFFF"
        />

        {/* Browser chrome bar */}
        <polygon
          points="-29,-26 -2,-42 -2,-48 -29,-32"
          fill="#E8E4DC"
        />
        {/* Traffic light dots */}
        <circle cx="-26" cy="-32" r="1.3" fill="#EF4444" />
        <circle cx="-22.5" cy="-34.2" r="1.3" fill="#F59E0B" />
        <circle cx="-19" cy="-36.4" r="1.3" fill="#10B981" />

        {/* Lavender content card on screen */}
        <polygon
          points="-26,-2 -5,-14.5 -5,-32 -26,-19.5"
          fill={`url(#scr-grad-${uid})`}
          stroke="#A78BFA"
          strokeWidth="0.6"
        />
        {/* Content placeholder lines */}
        <line x1="-24" y1="-12" x2="-10" y2="-20" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="-24" y1="-7" x2="-8" y2="-16.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="-24" y1="-2" x2="-14" y2="-8" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      {/* ───── 3. USER PILL BADGE ───── */}
      {/* Centered below pedestal */}
      <g transform="translate(0, 68)">
        <rect
          x="-36"
          y="-12"
          width="72"
          height="24"
          rx="12"
          fill="#252820"
          stroke="#252820"
          strokeWidth="2"
        />
        <text
          x="-20"
          y="4"
          fontSize="11"
          fill="#FFFFFF"
          className="select-none"
        >
          👤
        </text>
        <text
          x="6"
          y="3.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="11"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {userLabel}
        </text>
      </g>

      {/* ───── 4. STATUS BADGE (e.g. "🚫 slowed to a crawl") ───── */}
      {statusBadge && (
        <g transform="translate(-48, 24)">
          {/* Measure: icon + text; fixed width for now */}
          <rect
            x="-80"
            y="-13"
            width="160"
            height="26"
            rx="13"
            fill="#FED7AA"
            stroke="#252820"
            strokeWidth="2.2"
          />
          {statusBadge.icon && React.isValidElement(statusBadge.icon) ? (
            <foreignObject x="-70" y="-7" width="14" height="14">
              {statusBadge.icon}
            </foreignObject>
          ) : statusBadge.icon ? (
            <text x="-66" y="4" fontSize="12" className="select-none">
              {statusBadge.icon}
            </text>
          ) : null}
          <text
            x="-2"
            y="3.5"
            textAnchor="middle"
            fill="#252820"
            fontSize="10.5"
            fontWeight="700"
            fontFamily="'SFMono-Regular', 'Consolas', monospace"
          >
            {statusBadge.text}
          </text>
        </g>
      )}

      {/* ───── 5. URL BADGE (e.g. "🌐 https://shop.example") ───── */}
      {urlBadge && (
        <g transform="translate(-16, -66)">
          <rect
            x="-78"
            y="-12"
            width="156"
            height="24"
            rx="12"
            fill="#FFFFFF"
            stroke="#252820"
            strokeWidth="2.2"
          />
          <circle cx="-64" cy="0" r="3.5" fill="#10B981" />
          <text
            x="2"
            y="4"
            textAnchor="middle"
            fill="#252820"
            fontSize="10"
            fontWeight="700"
            fontFamily="'SFMono-Regular', 'Consolas', monospace"
          >
            {urlBadge}
          </text>
        </g>
      )}
    </g>
  );
}
