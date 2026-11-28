import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { playDotIn, playDotOut } from '../../lib/sound';

const IS_LIVE_BACKEND = true;

// Persisted across SPA navigation (resets only on full website reload)
let hasPlayedInitialDrop = false;
const persistedNodeCoords = new Map();

// ============================================================================
// 1. TRUE 2:1 ISOMETRIC PROJECTION MATH
// ============================================================================
const ORIGIN_X = 820;
const ORIGIN_Y = 485;
const TILE_W = 54; // Isometric horizontal half-tile width
const TILE_H = 27; // Isometric vertical half-tile height
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Projects isometric grid coordinates (u, v, zHeight) into 2D SVG coordinates.
 * +u goes down-right, +v goes down-left, +z goes straight up.
 */
function iso(u, v, z = 0) {
  return {
    x: ORIGIN_X + (u - v) * TILE_W,
    y: ORIGIN_Y + (u + v) * TILE_H - z,
  };
}

/**
 * Inverse projection: converts 2D SVG world coordinates (x, y) back to isometric (u, v) on z=0 plane.
 */
function invIso(x, y) {
  const dx = (x - ORIGIN_X) / TILE_W;
  const dy = (y - ORIGIN_Y) / TILE_H;
  return {
    u: (dx + dy) * 0.5,
    v: (dy - dx) * 0.5,
  };
}

// ============================================================================
// 2. TOPOLOGY & CONSTANTS (NO CLUTTER BADGES, PURE CLIENTS -> LB -> SERVERS)
// ============================================================================
const ALGORITHMS = ['ROUND ROBIN', 'LEAST CONN', 'IP HASH'];
const RPS_LEVELS = [12, 45, 180, 1000, 5000];

const CLIENT_PRESETS = [
  { label: 'Web Client 1', dashed: false },
  { label: 'Web Client 2', dashed: false },
  { label: 'API Consumer', dashed: false },
  { label: 'Edge Worker', dashed: true },
  { label: 'Mobile App', dashed: false },
  { label: 'IoT Gateway', dashed: true },
];

const SERVER_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const THEMES = {
  light: {
    gridLine: '#e4dccb',
    shadow: 'rgba(130, 116, 94, 0.28)',
    wireActive: '#2e2b26',
    wireDashed: '#8e8576',
    wireOffline: '#a39a8b',
    portRingFill: '#fdfbf7',

    // Solid Warm Honey-Amber Load Balancer
    lbTop0: '#f6d573',
    lbTop1: '#f6d573',
    lbWall0: '#e2b74b',
    lbWall48: '#e2b74b',
    lbWall54: '#d3a53b',
    lbWall100: '#e2b74b',
    lbStroke: '#23211e',
    lbCrease: 'rgba(35, 33, 30, 0.10)',
    lbBevel: 'rgba(255, 255, 255, 0.78)',
    lbIcon: '#23211e',
    lbTitle: '#23211e',
    lbSubtitle: '#594210',
    lbHalo: '#d99b26',

    // Solid Crisp Sky-Periwinkle Servers
    srvTop0: '#cde0fb',
    srvTop1: '#cde0fb',
    srvWall0: '#a9c7f2',
    srvWall48: '#a9c7f2',
    srvWall54: '#95b6e6',
    srvWall100: '#a9c7f2',
    srvStroke: '#1e293b',
    srvCrease: 'rgba(30, 41, 59, 0.10)',
    srvBevel: 'rgba(255, 255, 255, 0.80)',
    srvRackFill: '#ffffff',
    srvRackStroke: '#1e293b',
    srvLedIdle: '#1e293b',
    srvLedFlash1: '#22c55e',
    srvLedFlash2: '#f97316',
    srvLedOffline: '#ef4444',
    srvTitle: '#0f172a',
    srvSubtitle: '#334155',
    srvHalo: '#3b82f6',

    srvOffTop0: '#ece7de',
    srvOffTop1: '#ece7de',
    srvOffWall0: '#d2cbc0',
    srvOffWall50: '#c5beb2',
    srvOffWall100: '#d2cbc0',
    srvOffStroke: '#57534e',
    srvOffTitle: '#64748b',
    srvOffSubtitle: '#64748b',
    srvOffRackFill: '#f8fafc',
    srvOffRackStroke: '#64748b',

    padTop0: '#efe9dc',
    padTop1: '#efe9dc',
    padWall0: '#dbd2c1',
    padWall50: '#cfc5b2',
    padWall100: '#dbd2c1',
    padStroke: '#23211e',
    padBevel: 'rgba(255, 255, 255, 0.82)',

    lapShadow: 'rgba(120, 108, 90, 0.24)',
    lapBaseRim: '#d5cdc0',
    lapDeck: '#f4efe4',
    lapStroke: '#23211e',
    lapKeyFill: '#ebe5d8',
    lapKeyStroke: '#9a9183',
    lapTrackpadFill: '#ebe5d8',
    lapTrackpadStroke: '#9a9183',
    lapLid0: '#4a453f',
    lapLid25: '#3e3a35',
    lapLid100: '#312e2a',
    lapBezelFill: '#2b2825',
    lapBezelStroke: '#23211e',
    lapSpecular: 'rgba(255, 255, 255, 0.78)',
    lapViewport: '#fcfaf5',
    lapToolbar: '#eae3d5',
    lapUrl: '#ffffff',
    lapHero: '#818cf8',
    lapHeroFlash: '#6366f1',
    lapSkeleton: '#d5cec0',

    pillClientShadow: 'rgba(35, 33, 30, 0.10)',
    pillServerShadow: 'rgba(35, 33, 30, 0.11)',
    pillHardShadow: '#23211e',
    pillBg: '#fdfbf7',
    pillOfflineBg: '#f5efe6',
    pillBorder: '#23211e',
    pillText: '#1e293b',
    pillOfflineText: '#b91c1c',
    pillIcon: '#334155',
    pillGear: '#475569',
    pillGearHole: '#fdfbf7',
    pillTrack: '#e5dfd1',
    pillToggleOn: '#4ade80',
    pillToggleOff: '#fb7185',
    pillToggleOffRefresh: '#fb7185',
    pillToggleStroke: '#1e293b',
    pillToggleText: '#0f172a',

    pktReqFill: '#f97316',
    pktReqStroke: '#1e293b',
    pktResFill: '#22c55e',
    pktResStroke: '#1e293b',
    pktHandFill: '#f8fafc',
    pktHandStroke: '#0ea5e9',

    lbArc: '#f59e0b',
    rippleReq: '#f97316',
    rippleRes: '#22c55e',
    floorWaveBurst: '#f59e0b',
    floorWaveOnline: '#22c55e',
    floorWaveOffline: '#ef4444',

    toastStroke: '#1e293b',
    toastOkBg: '#dcfce7',
    toastOkText: '#166534',
    toastFailBg: '#fee2e2',
    toastFailText: '#991b1b',
    toastModeBg: '#fef3c7',
    toastModeText: '#78350f',
  },
  dark: {
    gridLine: '#232734',
    shadow: 'rgba(4, 6, 12, 0.65)',
    wireActive: '#8b95ad',
    wireDashed: '#525a6e',
    wireOffline: '#414757',
    portRingFill: '#161922',

    // Solid Matte Warm Gold Load Balancer
    lbTop0: '#f3c35c',
    lbTop1: '#f3c35c',
    lbWall0: '#d49d35',
    lbWall48: '#d49d35',
    lbWall54: '#bf8a27',
    lbWall100: '#d49d35',
    lbStroke: '#111318',
    lbCrease: 'rgba(17, 19, 24, 0.20)',
    lbBevel: 'rgba(255, 248, 224, 0.52)',
    lbIcon: '#1a1406',
    lbTitle: '#1a1406',
    lbSubtitle: '#4b360a',
    lbHalo: '#f3c35c',

    // Solid Matte Steel-Periwinkle Backend Servers (High-Contrast White Typography)
    srvTop0: '#4b77cf',
    srvTop1: '#4b77cf',
    srvWall0: '#395fa8',
    srvWall48: '#395fa8',
    srvWall54: '#315293',
    srvWall100: '#395fa8',
    srvStroke: '#111318',
    srvCrease: 'rgba(12, 18, 36, 0.25)',
    srvBevel: 'rgba(219, 234, 254, 0.42)',
    srvRackFill: '#f8fafc',
    srvRackStroke: '#172542',
    srvLedIdle: '#172542',
    srvLedFlash1: '#22c55e',
    srvLedFlash2: '#f97316',
    srvLedOffline: '#ef4444',
    srvTitle: '#ffffff',
    srvSubtitle: '#dbeafe',
    srvHalo: '#7aa7f7',

    // Solid Matte Slate Offline Servers
    srvOffTop0: '#2b303d',
    srvOffTop1: '#2b303d',
    srvOffWall0: '#20242e',
    srvOffWall50: '#1c2029',
    srvOffWall100: '#20242e',
    srvOffStroke: '#485064',
    srvOffTitle: '#94a3b8',
    srvOffSubtitle: '#64748b',
    srvOffRackFill: '#181b23',
    srvOffRackStroke: '#525b70',

    // Solid Matte Charcoal Client Pads & Crisp Slate Laptops
    padTop0: '#272c39',
    padTop1: '#272c39',
    padWall0: '#1d212b',
    padWall50: '#191d26',
    padWall100: '#1d212b',
    padStroke: '#434b60',
    padBevel: 'rgba(203, 213, 225, 0.22)',

    lapShadow: 'rgba(4, 6, 12, 0.50)',
    lapBaseRim: '#1e222d',
    lapDeck: '#373d4e',
    lapStroke: '#111318',
    lapKeyFill: '#4d556b',
    lapKeyStroke: '#232734',
    lapTrackpadFill: '#434a5e',
    lapTrackpadStroke: '#232734',
    lapLid0: '#495063',
    lapLid25: '#3a4050',
    lapLid100: '#2a2f3c',
    lapBezelFill: '#14171f',
    lapBezelStroke: '#646e87',
    lapSpecular: 'rgba(226, 232, 240, 0.45)',
    lapViewport: '#161922',
    lapToolbar: '#242936',
    lapUrl: '#373e50',
    lapHero: '#7aa2f7',
    lapHeroFlash: '#9dbbfb',
    lapSkeleton: '#3f475b',

    // Clean Solid Dark Pills
    pillClientShadow: 'rgba(4, 6, 12, 0.42)',
    pillServerShadow: 'rgba(4, 6, 12, 0.45)',
    pillHardShadow: '#0b0d12',
    pillBg: '#1c202b',
    pillOfflineBg: '#1e191e',
    pillBorder: '#434b60',
    pillText: '#f1f5f9',
    pillOfflineText: '#fda4af',
    pillIcon: '#93c5fd',
    pillGear: '#93c5fd',
    pillGearHole: '#1c202b',
    pillTrack: '#2d3343',
    pillToggleOn: '#4ade80',
    pillToggleOff: '#fb7185',
    pillToggleOffRefresh: '#fb7185',
    pillToggleStroke: '#111318',
    pillToggleText: '#111318',

    // Crisp Solid Packet Dots (Zero Glow)
    pktReqFill: '#f97352',
    pktReqStroke: '#111318',
    pktResFill: '#4ade80',
    pktResStroke: '#111318',
    pktHandFill: '#1c202b',
    pktHandStroke: '#60a5fa',

    lbArc: '#f3c35c',
    rippleReq: '#f97352',
    rippleRes: '#4ade80',
    floorWaveBurst: '#f3c35c',
    floorWaveOnline: '#4ade80',
    floorWaveOffline: '#fb7185',

    toastStroke: '#111318',
    toastOkBg: '#4ade80',
    toastOkText: '#0a2614',
    toastFailBg: '#fb7185',
    toastFailText: '#330812',
    toastModeBg: '#f3c35c',
    toastModeText: '#261a04',
  },
};

function createInitialState() {
  return {
    loadBalancer: {
      id: 'lb',
      u: 0,
      v: 0,
      halfSize: 1.48,
      cornerR: 0.44,
      height: 64,
      title1: 'LOAD',
      title2: 'BALANCER',
      subtitle: 'ROUND ROBIN',
    },
    clients: [
      { id: 'client-1', label: 'Web Client 1', dashed: false, u: 0, v: 0 },
      { id: 'client-2', label: 'Web Client 2', dashed: false, u: 0, v: 0 },
      { id: 'client-3', label: 'API Consumer', dashed: false, u: 0, v: 0 },
      { id: 'client-4', label: 'Edge Worker', dashed: true, u: 0, v: 0 },
    ],
    servers: [
      { id: 'srv-a', name: 'Server A', cpu: 38, connections: 14, healthy: true, halfSize: 1.38, cornerR: 0.42, height: 58, u: 0, v: 0 },
      { id: 'srv-b', name: 'Server B', cpu: 52, connections: 18, healthy: true, halfSize: 1.38, cornerR: 0.42, height: 58, u: 0, v: 0 },
      { id: 'srv-c', name: 'Server C', cpu: 34, connections: 12, healthy: true, halfSize: 1.38, cornerR: 0.42, height: 58, u: 0, v: 0 },
    ],
  };
}

// ============================================================================
// 3. SVG ELEMENT & GEOMETRY BUILDERS
// ============================================================================
function createSVG(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

/**
 * Generates a true isometric rounded-corner square in (u, v) grid space,
 * projected to 2D screen coordinates at height z.
 */
function getIsoRoundedSquarePoints(centerU, centerV, halfS, cornerR, z = 0, stepsPerCorner = 14) {
  const pts = [];
  const r = Math.min(cornerR, halfS * 0.65);
  const inner = halfS - r;

  const corners = [
    { cu: centerU - inner, cv: centerV - inner, a0: Math.PI, a1: Math.PI * 1.5 },
    { cu: centerU + inner, cv: centerV - inner, a0: Math.PI * 1.5, a1: Math.PI * 2.0 },
    { cu: centerU + inner, cv: centerV + inner, a0: 0, a1: Math.PI * 0.5 },
    { cu: centerU - inner, cv: centerV + inner, a0: Math.PI * 0.5, a1: Math.PI },
  ];

  corners.forEach((c) => {
    for (let i = 0; i <= stepsPerCorner; i++) {
      const theta = c.a0 + (i / stepsPerCorner) * (c.a1 - c.a0);
      const u = c.cu + r * Math.cos(theta);
      const v = c.cv + r * Math.sin(theta);
      const p = iso(u, v, z);
      pts.push({ x: p.x, y: p.y, u, v });
    }
  });

  return pts;
}

function pointsToClosedPath(pts) {
  if (!pts.length) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
  }
  return `${d} Z`;
}

function pointsToOpenPath(pts) {
  if (!pts.length) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
  }
  return d;
}

/**
 * Extracts the visible front-facing rim chain of an isometric rounded square
 * and extrudes it downward by `height`.
 */
function buildIsoRoundedBlockExtrusion(centerU, centerV, halfS, cornerR, height) {
  const topPts = getIsoRoundedSquarePoints(centerU, centerV, halfS, cornerR, height, 18);

  let minXIdx = 0;
  let maxXIdx = 0;
  for (let i = 1; i < topPts.length; i++) {
    if (topPts[i].x < topPts[minXIdx].x) minXIdx = i;
    if (topPts[i].x > topPts[maxXIdx].x) maxXIdx = i;
  }

  const frontRim = [];
  let curr = maxXIdx;
  while (true) {
    frontRim.push(topPts[curr]);
    if (curr === minXIdx) break;
    curr = (curr + 1) % topPts.length;
  }

  let wallD = `M ${frontRim[0].x.toFixed(2)} ${frontRim[0].y.toFixed(2)}`;
  for (let i = 1; i < frontRim.length; i++) {
    wallD += ` L ${frontRim[i].x.toFixed(2)} ${frontRim[i].y.toFixed(2)}`;
  }
  for (let i = frontRim.length - 1; i >= 0; i--) {
    wallD += ` L ${frontRim[i].x.toFixed(2)} ${(frontRim[i].y + height).toFixed(2)}`;
  }
  wallD += ' Z';

  const trim = Math.min(4, Math.floor(frontRim.length * 0.12));
  const highlightPts = frontRim.slice(trim, frontRim.length - trim).map((p) => ({
    x: p.x,
    y: p.y - 1.2,
  }));

  return {
    topPathD: pointsToClosedPath(topPts),
    wallPathD: wallD,
    bevelHighlightD: pointsToOpenPath(highlightPts),
  };
}

function strokeRoundedRect2D(ctx, x, y, w, h, r, fillHex) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fillHex) {
    ctx.fillStyle = fillHex;
    ctx.fill();
  }
  ctx.stroke();
}

function createIsoDiamondBlockSVG({
  id,
  u,
  v,
  halfSize,
  cornerR,
  height,
  topGradId,
  wallGradId,
  iconType,
  title1,
  title2,
  subtitle = '',
  isOffline = false,
  palette = THEMES.light,
}) {
  const isGlobe = iconType === 'globe';
  const blockStroke = isGlobe ? palette.lbStroke : isOffline ? palette.srvOffStroke : palette.srvStroke;
  const creaseColor = isGlobe ? palette.lbCrease : palette.srvCrease;
  const bevelColor = isGlobe ? palette.lbBevel : palette.srvBevel;
  const haloColor = isGlobe ? palette.lbHalo : palette.srvHalo;
  const titleColor = isGlobe ? palette.lbTitle : isOffline ? palette.srvOffTitle : palette.srvTitle;
  const rackFill = isOffline ? palette.srvOffRackFill : palette.srvRackFill;
  const rackStroke = isOffline ? palette.srvOffRackStroke : palette.srvRackStroke;
  const initialLedColor = isOffline ? palette.srvLedOffline : palette.srvLedIdle;

  const shadowPts = getIsoRoundedSquarePoints(u + 0.08, v + 0.08, halfSize * 1.04, cornerR * 1.04, -3, 12);
  const shadowPath = createSVG('path', {
    d: pointsToClosedPath(shadowPts),
    fill: palette.shadow,
  });

  const outerG = createSVG('g', { id, class: 'iso-interactive-node' });
  const bounceG = createSVG('g');
  outerG.appendChild(bounceG);

  const geom = buildIsoRoundedBlockExtrusion(u, v, halfSize, cornerR, height);
  const centerTop = iso(u, v, height);
  const frontCornerTop = iso(u + halfSize - cornerR * 0.35, v + halfSize - cornerR * 0.35, height);

  const wallPath = createSVG('path', {
    d: geom.wallPathD,
    fill: `url(#${wallGradId})`,
    stroke: blockStroke,
    'stroke-width': '2.7',
    'stroke-linejoin': 'round',
  });
  bounceG.appendChild(wallPath);

  const creaseLine = createSVG('line', {
    x1: frontCornerTop.x.toFixed(1),
    y1: (frontCornerTop.y + 3).toFixed(1),
    x2: frontCornerTop.x.toFixed(1),
    y2: (frontCornerTop.y + height - 3).toFixed(1),
    stroke: creaseColor,
    'stroke-width': '8',
    'stroke-linecap': 'round',
  });
  bounceG.appendChild(creaseLine);

  const topPath = createSVG('path', {
    d: geom.topPathD,
    fill: `url(#${topGradId})`,
    stroke: blockStroke,
    'stroke-width': '2.6',
    'stroke-linejoin': 'round',
  });
  bounceG.appendChild(topPath);

  const bevelHighlight = createSVG('path', {
    d: geom.bevelHighlightD,
    fill: 'none',
    stroke: bevelColor,
    'stroke-width': '3.1',
    'stroke-linecap': 'round',
  });
  bounceG.appendChild(bevelHighlight);

  const haloPts = getIsoRoundedSquarePoints(u, v, halfSize * 0.78, cornerR * 0.78, height + 0.5, 10);
  const haloRing = createSVG('path', {
    d: pointsToClosedPath(haloPts),
    fill: 'none',
    stroke: haloColor,
    'stroke-width': '2.2',
    'stroke-dasharray': '6 5',
    opacity: '0',
  });
  bounceG.appendChild(haloRing);

  const isServer = iconType === 'server';
  const iconG = createSVG('g', {
    transform: `translate(${centerTop.x.toFixed(1)}, ${(centerTop.y - (isServer ? 22 : 24)).toFixed(1)}) scale(${isServer ? '0.88' : '0.88'})`,
  });

  let led1 = null;
  let led2 = null;
  const rackBoxes = [];
  const rackLines = [];
  const globeEls = [];

  if (iconType === 'globe') {
    const gCircle = createSVG('circle', {
      cx: 0,
      cy: 0,
      r: 20,
      fill: 'none',
      stroke: palette.lbIcon,
      'stroke-width': '2.8',
    });
    const gEllipse = createSVG('ellipse', {
      cx: 0,
      cy: 0,
      rx: 9.5,
      ry: 20,
      fill: 'none',
      stroke: palette.lbIcon,
      'stroke-width': '2.6',
    });
    const gLine = createSVG('line', {
      x1: -19.5,
      y1: 0,
      x2: 19.5,
      y2: 0,
      stroke: palette.lbIcon,
      'stroke-width': '2.6',
    });
    globeEls.push(gCircle, gEllipse, gLine);
    iconG.appendChild(gCircle);
    iconG.appendChild(gEllipse);
    iconG.appendChild(gLine);
  } else if (iconType === 'server') {
    const rackBox1 = createSVG('rect', {
      x: -22,
      y: -18,
      width: 44,
      height: 15,
      rx: 3.6,
      fill: rackFill,
      stroke: rackStroke,
      'stroke-width': '2.6',
    });
    rackBoxes.push(rackBox1);
    iconG.appendChild(rackBox1);

    const rackLine1 = createSVG('line', {
      x1: -14,
      y1: -10.5,
      x2: 2,
      y2: -10.5,
      stroke: rackStroke,
      'stroke-width': '2.6',
      'stroke-linecap': 'round',
    });
    rackLines.push(rackLine1);
    iconG.appendChild(rackLine1);

    led1 = createSVG('circle', {
      cx: 12.5,
      cy: -10.5,
      r: 2.8,
      fill: initialLedColor,
    });
    iconG.appendChild(led1);

    const rackBox2 = createSVG('rect', {
      x: -22,
      y: 2,
      width: 44,
      height: 15,
      rx: 3.6,
      fill: rackFill,
      stroke: rackStroke,
      'stroke-width': '2.6',
    });
    rackBoxes.push(rackBox2);
    iconG.appendChild(rackBox2);

    const rackLine2 = createSVG('line', {
      x1: -14,
      y1: 9.5,
      x2: 2,
      y2: 9.5,
      stroke: rackStroke,
      'stroke-width': '2.6',
      'stroke-linecap': 'round',
    });
    rackLines.push(rackLine2);
    iconG.appendChild(rackLine2);

    led2 = createSVG('circle', {
      cx: 12.5,
      cy: 9.5,
      r: 2.8,
      fill: initialLedColor,
    });
    iconG.appendChild(led2);
  }
  bounceG.appendChild(iconG);

  const subColor = isGlobe
    ? palette.lbSubtitle
    : isOffline
    ? (palette.srvOffSubtitle || palette.srvOffTitle)
    : (palette.srvSubtitle || titleColor);

  const t1 = createSVG('text', {
    x: centerTop.x.toFixed(1),
    y: (centerTop.y + (isGlobe ? 11 : 17)).toFixed(1),
    'text-anchor': 'middle',
    fill: titleColor,
    'font-family': "'JetBrains Mono', monospace",
    'font-size': isGlobe ? '15.5px' : '16.5px',
    'font-weight': '800',
    'letter-spacing': '-0.02em',
  });
  t1.textContent = title1;
  bounceG.appendChild(t1);

  let t2 = null;
  if (title2) {
    t2 = createSVG('text', {
      x: centerTop.x.toFixed(1),
      y: (centerTop.y + (isGlobe ? 29 : 35)).toFixed(1),
      'text-anchor': 'middle',
      fill: titleColor,
      'font-family': "'JetBrains Mono', monospace",
      'font-size': isGlobe ? '14.5px' : '15.5px',
      'font-weight': '700',
    });
    t2.textContent = title2;
    bounceG.appendChild(t2);
  }

  let subEl = null;
  if (subtitle) {
    subEl = createSVG('text', {
      x: centerTop.x.toFixed(1),
      y: (centerTop.y + (isGlobe ? 47 : title2 ? 52 : 35)).toFixed(1),
      'text-anchor': 'middle',
      fill: subColor,
      'font-family': "'JetBrains Mono', monospace",
      'font-size': isGlobe ? '10px' : '9.5px',
      'font-weight': '700',
      'letter-spacing': isGlobe ? '0.06em' : '0.01em',
    });
    subEl.textContent = subtitle;
    bounceG.appendChild(subEl);
  }

  let meter = null;
  if (isServer) {
    const leftWallCenter = iso(u, v + halfSize, height * 0.50);
    const rightWallCenter = iso(u + halfSize, v, height * 0.50);
    const isDarkWall = palette.srvWall0 === '#395fa8';
    const wallVentFill = isOffline
      ? isDarkWall
        ? '#302026'
        : '#b5afa6'
      : isDarkWall
      ? '#1b479e'
      : '#7699cf';
    const wallVentHighlight = isOffline
      ? 'rgba(255,200,200,0.14)'
      : isDarkWall
      ? 'rgba(191, 219, 254, 0.25)'
      : 'rgba(255, 255, 255, 0.45)';
    const socketColor = isDarkWall ? '#0d172c' : '#1e293b';

    // 1. Front-Left Wall: Silkscreened Live Telemetry + Machined Cooling Vents + Socketed Load LEDs
    const leftMeterG = createSVG('g', {
      transform: `translate(${leftWallCenter.x.toFixed(2)}, ${leftWallCenter.y.toFixed(2)}) skewY(26.565)`,
    });

    const gearHoleColor = isDarkWall ? '#274787' : '#8eb1e6';
    const gearWrap = createSVG('g', { transform: 'translate(-47, -7.2) scale(0.58)' });
    const gearPath = createSVG('path', {
      class: 'svg-gear-spin',
      d: 'M -2 -7.2 L 2 -7.2 L 2.6 -5.0 L 4.6 -4.0 L 6.6 -5.0 L 8.2 -2.4 L 6.4 -0.8 L 6.4 0.8 L 8.2 2.4 L 6.6 5.0 L 4.6 4.0 L 2.6 5.0 L 2 7.2 L -2 7.2 L -2.6 5.0 L -4.6 4.0 L -6.6 5.0 L -8.2 2.4 L -6.4 0.8 L -6.4 -0.8 L -8.2 -2.4 L -6.6 -5.0 L -4.6 -4.0 L -2.6 -5.0 Z',
      fill: palette.srvSubtitle,
    });
    gearWrap.appendChild(gearPath);
    const gearHole = createSVG('circle', { cx: 0, cy: 0, r: 2.5, fill: gearHoleColor });
    gearWrap.appendChild(gearHole);
    leftMeterG.appendChild(gearWrap);

    const cpuText = createSVG('text', {
      x: -38,
      y: -4.0,
      'text-anchor': 'start',
      fill: palette.srvTitle,
      'font-family': "'JetBrains Mono', monospace",
      'font-size': '9.6px',
      'font-weight': '800',
    });
    cpuText.textContent = '0%';
    leftMeterG.appendChild(cpuText);

    const reqText = createSVG('text', {
      x: 52,
      y: -4.2,
      'text-anchor': 'end',
      fill: palette.srvSubtitle,
      'font-family': "'JetBrains Mono', monospace",
      'font-size': '8.4px',
      'font-weight': '700',
    });
    reqText.textContent = '0 req';
    leftMeterG.appendChild(reqText);

    // 3 Machined Cooling Vent Louvers cut into the left side of the front-left chassis wall
    const leftVentSlots = [2.0, 6.2, 10.4].map((vy) => {
      const slot = createSVG('rect', {
        x: -52,
        y: vy - 1.1,
        width: 34,
        height: 2.2,
        rx: 1.1,
        fill: wallVentFill,
      });
      const lip = createSVG('line', {
        x1: -51,
        y1: vy + 1.3,
        x2: -19,
        y2: vy + 1.3,
        stroke: wallVentHighlight,
        'stroke-width': '0.75',
      });
      leftMeterG.appendChild(slot);
      leftMeterG.appendChild(lip);
      return { slot, lip };
    });

    // 7 Socketed Circular Hardware Load LEDs built flush into the server wall
    const ledCount = 7;
    const ledSegments = [];
    for (let sIdx = 0; sIdx < ledCount; sIdx++) {
      const cx = -7 + sIdx * 9.3;
      const cy = 6.2;
      leftMeterG.appendChild(
        createSVG('circle', {
          cx,
          cy,
          r: 3.1,
          fill: socketColor,
        })
      );
      const seg = createSVG('circle', {
        cx,
        cy,
        r: 1.9,
        fill: '#1c2f52',
      });
      leftMeterG.appendChild(seg);
      ledSegments.push(seg);
    }

    bounceG.appendChild(leftMeterG);

    // 2. Front-Right Wall: Machined Chassis Cooling Vents + Socketed Status LEDs + Power Rocker
    const rightStatusG = createSVG('g', {
      transform: `translate(${rightWallCenter.x.toFixed(2)}, ${rightWallCenter.y.toFixed(2)}) skewY(-26.565)`,
    });

    const ventSlots = [-7.5, -2.5, 2.5, 7.5].map((vy) => {
      const slot = createSVG('rect', {
        x: -44,
        y: vy - 1.2,
        width: 35,
        height: 2.4,
        rx: 1.2,
        fill: wallVentFill,
      });
      const lip = createSVG('line', {
        x1: -43,
        y1: vy + 1.4,
        x2: -10,
        y2: vy + 1.4,
        stroke: wallVentHighlight,
        'stroke-width': '0.8',
      });
      rightStatusG.appendChild(slot);
      rightStatusG.appendChild(lip);
      return { slot, lip };
    });

    // 2 Vertical Socketed Status LEDs matching the LB chassis look
    const signalBars = [-4.2, 3.8].map((cy) => {
      rightStatusG.appendChild(
        createSVG('circle', { cx: -1, cy, r: 3.0, fill: socketColor })
      );
      const led = createSVG('circle', {
        cx: -1,
        cy,
        r: 1.9,
        fill: '#4ade80',
      });
      rightStatusG.appendChild(led);
      return led;
    });

    // Flush hardware socket + ON/OFF rocker switch
    rightStatusG.appendChild(
      createSVG('rect', {
        x: 6.5,
        y: -8.5,
        width: 39,
        height: 17,
        rx: 4,
        fill: socketColor,
      })
    );

    const toggleBg = createSVG('rect', {
      x: 8,
      y: -7,
      width: 36,
      height: 14,
      rx: 3,
      fill: isOffline ? palette.pillToggleOff : palette.pillToggleOn,
    });
    rightStatusG.appendChild(toggleBg);

    const toggleText = createSVG('text', {
      x: 26,
      y: 3.0,
      'text-anchor': 'middle',
      fill: palette.pillToggleText,
      'font-family': "'JetBrains Mono', monospace",
      'font-size': '8.8px',
      'font-weight': '800',
    });
    toggleText.textContent = isOffline ? 'OFF' : 'ON';
    rightStatusG.appendChild(toggleText);

    bounceG.appendChild(rightStatusG);

    meter = {
      ledSegments,
      leftVentSlots,
      ventSlots,
      cpuText,
      reqText,
      gearPath,
      gearHole,
      signalBars,
      toggleBg,
      toggleText,
      isDarkWall,
    };
  }

  let lbLights = null;
  if (isGlobe) {
    const leftWallCenter = iso(u, v + halfSize, height * 0.50);
    const rightWallCenter = iso(u + halfSize, v, height * 0.50);

    // 1. Front-Left LB Wall: Machined Chassis Cooling Vents + Recessed Status LED Matrix (no sticker plate)
    const lbLeftG = createSVG('g', {
      transform: `translate(${leftWallCenter.x.toFixed(2)}, ${leftWallCenter.y.toFixed(2)}) skewY(26.565)`,
    });

    const leftVentSlots = [-8.0, -3.0, 2.0, 7.0].map((vy) => {
      const slot = createSVG('rect', {
        x: -54,
        y: vy - 1.3,
        width: 64,
        height: 2.6,
        rx: 1.3,
        fill: '#8c5a08',
      });
      const lip = createSVG('line', {
        x1: -53,
        y1: vy + 1.5,
        x2: 9,
        y2: vy + 1.5,
        stroke: 'rgba(255, 244, 204, 0.28)',
        'stroke-width': '0.8',
      });
      lbLeftG.appendChild(slot);
      lbLeftG.appendChild(lip);
      return { slot, lip };
    });

    // Subtle divider louver groove between vents and LED array
    lbLeftG.appendChild(
      createSVG('line', {
        x1: 16,
        y1: -11,
        x2: 16,
        y2: 11,
        stroke: 'rgba(120, 72, 10, 0.35)',
        'stroke-width': '1',
      })
    );

    // 2x3 Hardware Status LED Matrix in recessed individual circular bezels directly on the wall
    const portBaseColors = ['#4ade80', '#38bdf8', '#fbbf24', '#4ade80', '#38bdf8', '#34d399'];
    const portLeds = portBaseColors.map((col, idx) => {
      const colIdx = idx % 3;
      const rowIdx = Math.floor(idx / 3);
      const cx = 25 + colIdx * 12.5;
      const cy = rowIdx === 0 ? -5.0 : 5.0;

      // Recessed dark socket ring
      lbLeftG.appendChild(
        createSVG('circle', {
          cx,
          cy,
          r: 3.3,
          fill: '#1a1207',
        })
      );
      // Inner LED jewel
      const led = createSVG('circle', {
        cx,
        cy,
        r: 2.0,
        fill: col,
        opacity: '0.9',
      });
      lbLeftG.appendChild(led);
      return { el: led, linkEl: null, baseColor: col };
    });
    bounceG.appendChild(lbLeftG);

    // 2. Front-Right LB Wall: Machined Chassis Cooling Louvers + Hardware Power Switch
    const lbRightG = createSVG('g', {
      transform: `translate(${rightWallCenter.x.toFixed(2)}, ${rightWallCenter.y.toFixed(2)}) skewY(-26.565)`,
    });
    const rightHousing = createSVG('rect', {
      x: -44,
      y: -12,
      width: 40,
      height: 24,
      rx: 2,
      fill: 'none',
      stroke: 'none',
    });
    lbRightG.appendChild(rightHousing);

    const rightVentSlots = [-7.5, -2.5, 2.5, 7.5].map((vy) => {
      const slot = createSVG('rect', {
        x: -44,
        y: vy - 1.2,
        width: 36,
        height: 2.5,
        rx: 1.2,
        fill: '#8c5a08',
      });
      const lip = createSVG('line', {
        x1: -43,
        y1: vy + 1.5,
        x2: -9,
        y2: vy + 1.5,
        stroke: 'rgba(255, 244, 204, 0.25)',
        'stroke-width': '0.8',
      });
      lbRightG.appendChild(slot);
      lbRightG.appendChild(lip);
      return { slot, lip };
    });

    const hbLed1 = createSVG('circle', { cx: -1, cy: -4.2, r: 2.1, fill: '#4ade80' });
    const hbLed2 = createSVG('circle', { cx: -1, cy: 3.8, r: 2.1, fill: '#38bdf8' });
    lbRightG.appendChild(
      createSVG('circle', { cx: -1, cy: -4.2, r: 3.1, fill: '#1a1207' })
    );
    lbRightG.appendChild(
      createSVG('circle', { cx: -1, cy: 3.8, r: 3.1, fill: '#1a1207' })
    );
    lbRightG.appendChild(hbLed1);
    lbRightG.appendChild(hbLed2);

    // Flush hardware socket + LIVE / DOWN rocker
    lbRightG.appendChild(
      createSVG('rect', {
        x: 6,
        y: -8.5,
        width: 39,
        height: 17,
        rx: 4,
        fill: '#1a1207',
      })
    );

    const livePillBg = createSVG('rect', {
      x: 7.5,
      y: -7,
      width: 36,
      height: 14,
      rx: 3,
      fill: '#4ade80',
    });
    lbRightG.appendChild(livePillBg);

    const livePillText = createSVG('text', {
      x: 25.5,
      y: 3.0,
      'text-anchor': 'middle',
      fill: '#0f172a',
      'font-family': "'JetBrains Mono', monospace",
      'font-size': '8.8px',
      'font-weight': '800',
    });
    livePillText.textContent = 'LIVE';
    lbRightG.appendChild(livePillText);
    bounceG.appendChild(lbRightG);

    lbLights = {
      leftVentSlots,
      rightVentSlots,
      portLeds,
      cornerDots: [],
      hbLed1,
      hbLed2,
      livePillBg,
      livePillText,
    };
  }

  // Keep reference helper accessible without unused warnings
  void strokeRoundedRect2D;

  return {
    shadowPath,
    group: outerG,
    bounceG,
    topPath,
    wallPath,
    bevelHighlight,
    haloRing,
    led1,
    led2,
    rackBoxes,
    rackLines,
    globeEls,
    t1,
    t2,
    subEl,
    meter,
    lbLights,
    centerTop,
  };
}

function buildRoundedQuadPath(pts, radius = 6) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];

    const v1x = prev.x - curr.x;
    const v1y = prev.y - curr.y;
    const l1 = Math.hypot(v1x, v1y) || 1;

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const l2 = Math.hypot(v2x, v2y) || 1;

    const r = Math.min(radius, l1 * 0.4, l2 * 0.4);
    const pA = { x: curr.x + (v1x / l1) * r, y: curr.y + (v1y / l1) * r };
    const pB = { x: curr.x + (v2x / l2) * r, y: curr.y + (v2y / l2) * r };

    d += i === 0 ? `M ${pA.x.toFixed(2)} ${pA.y.toFixed(2)}` : ` L ${pA.x.toFixed(2)} ${pA.y.toFixed(2)}`;
    d += ` Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${pB.x.toFixed(2)} ${pB.y.toFixed(2)}`;
  }
  return `${d} Z`;
}

function createIsometricLaptopNodeSVG({ u, v, scale = 0.88, palette = THEMES.light }) {
  const padHalfS = 1.24 * scale;
  const padCornerR = 0.36 * scale;
  const padH = 20 * scale;

  const shadowPts = getIsoRoundedSquarePoints(u + 0.07, v + 0.07, padHalfS * 1.05, padCornerR * 1.05, -2, 12);
  const shadowPath = createSVG('path', {
    d: pointsToClosedPath(shadowPts),
    fill: palette.shadow,
  });

  const outerG = createSVG('g', { class: 'iso-interactive-node' });
  const bounceG = createSVG('g');
  outerG.appendChild(bounceG);

  const padGeom = buildIsoRoundedBlockExtrusion(u, v, padHalfS, padCornerR, padH);

  bounceG.appendChild(
    createSVG('path', {
      d: padGeom.wallPathD,
      fill: 'url(#pad-wall-grad)',
      stroke: palette.padStroke,
      'stroke-width': '2.5',
      'stroke-linejoin': 'round',
    })
  );

  bounceG.appendChild(
    createSVG('path', {
      d: padGeom.topPathD,
      fill: 'url(#pad-top-grad)',
      stroke: palette.padStroke,
      'stroke-width': '2.4',
      'stroke-linejoin': 'round',
    })
  );

  bounceG.appendChild(
    createSVG('path', {
      d: padGeom.bevelHighlightD,
      fill: 'none',
      stroke: palette.padBevel,
      'stroke-width': '3.0',
      'stroke-linecap': 'round',
    })
  );

  const padTopCenter = iso(u, v, padH);
  const laptopG = createSVG('g', {
    transform: `translate(${padTopCenter.x.toFixed(2)}, ${padTopCenter.y.toFixed(2)}) scale(${scale})`,
  });
  bounceG.appendChild(laptopG);

  function lapPt(lu, lv) {
    return {
      x: -52 + lu * 58 + lv * 44,
      y: -5 - lu * 29 + lv * 22,
    };
  }

  const p00 = lapPt(0, 0);
  const p10 = lapPt(1, 0);
  const p11 = lapPt(1, 1);
  const p01 = lapPt(0, 1);

  laptopG.appendChild(
    createSVG('path', {
      d: buildRoundedQuadPath(
        [
          { x: p00.x + 2, y: p00.y + 4 },
          { x: p10.x + 2, y: p10.y + 4 },
          { x: p11.x + 2, y: p11.y + 4 },
          { x: p01.x + 2, y: p01.y + 4 },
        ],
        5.5
      ),
      fill: palette.lapShadow,
    })
  );

  laptopG.appendChild(
    createSVG('path', {
      d: buildRoundedQuadPath(
        [
          { x: p00.x, y: p00.y + 3.0 },
          { x: p10.x, y: p10.y + 3.0 },
          { x: p11.x, y: p11.y + 3.0 },
          { x: p01.x, y: p01.y + 3.0 },
        ],
        5.0
      ),
      fill: palette.lapBaseRim,
      stroke: palette.lapStroke,
      'stroke-width': '2.2',
    })
  );

  laptopG.appendChild(
    createSVG('path', {
      d: buildRoundedQuadPath([p00, p10, p11, p01], 5.0),
      fill: palette.lapDeck,
      stroke: palette.lapStroke,
      'stroke-width': '2.2',
    })
  );

  const keysG = createSVG('g', {
    fill: palette.lapKeyFill,
    stroke: palette.lapKeyStroke,
    'stroke-width': '1.0',
    'stroke-linejoin': 'round',
  });
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 10; c++) {
      const u0 = 0.065 + (c / 10) * 0.87;
      const u1 = u0 + (0.87 / 10) * 0.74;
      const v0 = 0.08 + (r / 4) * 0.49;
      const v1 = v0 + (0.49 / 4) * 0.72;
      const k0 = lapPt(u0, v0);
      const k1 = lapPt(u1, v0);
      const k2 = lapPt(u1, v1);
      const k3 = lapPt(u0, v1);
      keysG.appendChild(
        createSVG('path', {
          d: `M ${k0.x.toFixed(1)} ${k0.y.toFixed(1)} L ${k1.x.toFixed(1)} ${k1.y.toFixed(1)} L ${k2.x.toFixed(1)} ${k2.y.toFixed(1)} L ${k3.x.toFixed(1)} ${k3.y.toFixed(1)} Z`,
        })
      );
    }
  }
  laptopG.appendChild(keysG);

  laptopG.appendChild(
    createSVG('path', {
      d: buildRoundedQuadPath(
        [lapPt(0.34, 0.63), lapPt(0.66, 0.63), lapPt(0.66, 0.91), lapPt(0.34, 0.91)],
        2.5
      ),
      fill: palette.lapTrackpadFill,
      stroke: palette.lapTrackpadStroke,
      'stroke-width': '1.2',
    })
  );

  const scrH = 63;
  const tiltBackX = -3.8;
  const sBL = { x: p00.x, y: p00.y };
  const sBR = { x: p10.x, y: p10.y };
  const sTL = { x: p00.x + tiltBackX, y: p00.y - scrH };
  const sTR = { x: p10.x + tiltBackX, y: p10.y - scrH };

  const lidOffX = -5.2;
  const lidOffY = -2.6;
  const bBL = { x: sBL.x + lidOffX, y: sBL.y + lidOffY };
  const bTL = { x: sTL.x + lidOffX, y: sTL.y + lidOffY };
  const bTR = { x: sTR.x + lidOffX, y: sTR.y + lidOffY };

  laptopG.appendChild(
    createSVG('path', {
      d: buildRoundedQuadPath([sBL, bBL, bTL, bTR, sTR, sTL], 5.2),
      fill: 'url(#laptop-lid-grad)',
      stroke: palette.lapBezelStroke,
      'stroke-width': '2.2',
      'stroke-linejoin': 'round',
    })
  );

  laptopG.appendChild(
    createSVG('path', {
      d: buildRoundedQuadPath([sBL, sBR, sTR, sTL], 4.8),
      fill: palette.lapBezelFill,
      stroke: palette.lapBezelStroke,
      'stroke-width': '2.2',
      'stroke-linejoin': 'round',
    })
  );

  laptopG.appendChild(
    createSVG('path', {
      d: `M ${(bTL.x + 1.5).toFixed(1)} ${(bTL.y + 7.2).toFixed(1)} Q ${(bTL.x + 2.2).toFixed(1)} ${(bTL.y + 1.5).toFixed(1)} ${(sTL.x + 2.4).toFixed(1)} ${(sTL.y + 1.5).toFixed(1)}`,
      fill: 'none',
      stroke: palette.lapSpecular,
      'stroke-width': '2.8',
      'stroke-linecap': 'round',
    })
  );

  function scrPt(su, sv) {
    const topX = sTL.x + (sTR.x - sTL.x) * su;
    const topY = sTL.y + (sTR.y - sTL.y) * su;
    const botX = sBL.x + (sBR.x - sBL.x) * su;
    const botY = sBL.y + (sBR.y - sBL.y) * su;
    return {
      x: topX + (botX - topX) * sv,
      y: topY + (botY - topY) * sv,
    };
  }

  function scrRoundedQuad(u0, v0, u1, v1, r = 2.4) {
    return buildRoundedQuadPath([scrPt(u0, v0), scrPt(u1, v0), scrPt(u1, v1), scrPt(u0, v1)], r);
  }

  laptopG.appendChild(createSVG('path', { d: scrRoundedQuad(0.06, 0.08, 0.935, 0.91, 3.0), fill: palette.lapViewport }));
  laptopG.appendChild(createSVG('path', { d: scrRoundedQuad(0.06, 0.08, 0.935, 0.23, 2.4), fill: palette.lapToolbar }));

  const dot1 = scrPt(0.125, 0.16);
  const dot2 = scrPt(0.19, 0.16);
  const dot3 = scrPt(0.255, 0.16);
  laptopG.appendChild(createSVG('circle', { cx: dot1.x.toFixed(1), cy: dot1.y.toFixed(1), r: 1.8, fill: '#e5735c' }));
  laptopG.appendChild(createSVG('circle', { cx: dot2.x.toFixed(1), cy: dot2.y.toFixed(1), r: 1.8, fill: '#e8bf56' }));
  laptopG.appendChild(createSVG('circle', { cx: dot3.x.toFixed(1), cy: dot3.y.toFixed(1), r: 1.8, fill: '#78c47a' }));

  laptopG.appendChild(createSVG('path', { d: scrRoundedQuad(0.32, 0.115, 0.89, 0.195, 1.8), fill: palette.lapUrl }));

  const heroBannerPath = createSVG('path', {
    d: scrRoundedQuad(0.11, 0.29, 0.88, 0.59, 3.0),
    fill: palette.lapHero,
  });
  laptopG.appendChild(heroBannerPath);

  laptopG.appendChild(createSVG('path', { d: scrRoundedQuad(0.11, 0.65, 0.70, 0.72, 1.6), fill: palette.lapSkeleton }));
  laptopG.appendChild(createSVG('path', { d: scrRoundedQuad(0.11, 0.76, 0.56, 0.83, 1.6), fill: palette.lapSkeleton }));

  return { shadowPath, group: outerG, bounceG, heroBannerPath, padTopCenter };
}

function buildRounded2DPathAndTable(pts2D, cornerRadius = 32) {
  const dense = [pts2D[0]];
  let svgPath = `M ${pts2D[0].x.toFixed(2)} ${pts2D[0].y.toFixed(2)}`;

  for (let i = 1; i < pts2D.length - 1; i++) {
    const prev = pts2D[i - 1];
    const curr = pts2D[i];
    const next = pts2D[i + 1];

    const dx1 = prev.x - curr.x;
    const dy1 = prev.y - curr.y;
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2);

    if (len1 < 5 || len2 < 5) {
      dense.push(curr);
      svgPath += ` L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
      continue;
    }

    const r = Math.min(cornerRadius, len1 * 0.44, len2 * 0.44);
    const pA = { x: curr.x + (dx1 / len1) * r, y: curr.y + (dy1 / len1) * r };
    const pB = { x: curr.x + (dx2 / len2) * r, y: curr.y + (dy2 / len2) * r };

    svgPath += ` L ${pA.x.toFixed(2)} ${pA.y.toFixed(2)} Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${pB.x.toFixed(2)} ${pB.y.toFixed(2)}`;

    const arcSteps = 24;
    for (let s = 1; s <= arcSteps; s++) {
      const t = s / arcSteps;
      const omt = 1 - t;
      dense.push({
        x: omt * omt * pA.x + 2 * omt * t * curr.x + t * t * pB.x,
        y: omt * omt * pA.y + 2 * omt * t * curr.y + t * t * pB.y,
      });
    }
  }

  const last = pts2D[pts2D.length - 1];
  dense.push(last);
  svgPath += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;

  const SAMPLE_COUNT = 1024;
  const cumDist = new Float32Array(dense.length);
  let totalLen = 0;
  for (let i = 1; i < dense.length; i++) {
    totalLen += Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y);
    cumDist[i] = totalLen;
  }

  const lutX = new Float32Array(SAMPLE_COUNT);
  const lutY = new Float32Array(SAMPLE_COUNT);
  const normX = new Float32Array(SAMPLE_COUNT);
  const normY = new Float32Array(SAMPLE_COUNT);

  let segIdx = 0;
  for (let s = 0; s < SAMPLE_COUNT; s++) {
    const targetD = (s / (SAMPLE_COUNT - 1)) * totalLen;
    while (segIdx < dense.length - 2 && cumDist[segIdx + 1] < targetD) {
      segIdx++;
    }
    const segLen = cumDist[segIdx + 1] - cumDist[segIdx];
    const alpha = segLen > 1e-5 ? (targetD - cumDist[segIdx]) / segLen : 0;
    lutX[s] = dense[segIdx].x + (dense[segIdx + 1].x - dense[segIdx].x) * alpha;
    lutY[s] = dense[segIdx].y + (dense[segIdx + 1].y - dense[segIdx].y) * alpha;
  }

  for (let s = 0; s < SAMPLE_COUNT; s++) {
    const sPrev = Math.max(0, s - 3);
    const sNext = Math.min(SAMPLE_COUNT - 1, s + 3);
    const tx = lutX[sNext] - lutX[sPrev];
    const ty = lutY[sNext] - lutY[sPrev];
    const len = Math.hypot(tx, ty) || 1;
    normX[s] = -ty / len;
    normY[s] = tx / len;
  }

  return {
    svgPath,
    lutX,
    lutY,
    normX,
    normY,
    totalLen,
    sampleCount: SAMPLE_COUNT,
    startPt: pts2D[0],
    endPt: last,
  };
}

function createArrowheadAndDockSVG(tipPt, fromPt, color = '#23211e', portRingFill = '#fdfbf7') {
  const g = createSVG('g');
  const angle = Math.atan2(tipPt.y - fromPt.y, tipPt.x - fromPt.x) * (180 / Math.PI);

  const portRing = createSVG('ellipse', {
    cx: tipPt.x.toFixed(2),
    cy: tipPt.y.toFixed(2),
    rx: '5.5',
    ry: '3.2',
    fill: portRingFill,
    stroke: color,
    'stroke-width': '2.0',
  });
  g.appendChild(portRing);

  const arrow = createSVG('path', {
    d: 'M 0 0 L -12 -5.5 L -9.2 0 L -12 5.5 Z',
    fill: color,
    transform: `translate(${tipPt.x.toFixed(2)}, ${tipPt.y.toFixed(2)}) rotate(${angle.toFixed(2)})`,
  });
  g.appendChild(arrow);

  return { group: g, arrow, portRing };
}

function createClientLabelPillSVG({ cx, cy, text, palette = THEMES.light }) {
  const width = Math.max(124, text.length * 8.4 + 42);
  const height = 29;
  const hw = width / 2;
  const hh = height / 2;
  const rx = hh;

  const g = createSVG('g', {
    transform: `translate(${cx.toFixed(2)}, ${cy.toFixed(2)})`,
    class: 'iso-interactive-node',
  });

  g.appendChild(
    createSVG('rect', {
      x: -hw + 1,
      y: -hh + 4.8,
      width,
      height,
      rx,
      fill: palette.pillClientShadow,
    })
  );
  g.appendChild(
    createSVG('rect', {
      x: -hw,
      y: -hh + 3.0,
      width,
      height,
      rx,
      fill: palette.pillHardShadow,
    })
  );
  g.appendChild(
    createSVG('rect', {
      x: -hw,
      y: -hh,
      width,
      height,
      rx,
      fill: palette.pillBg,
      stroke: palette.pillBorder,
      'stroke-width': '2.3',
    })
  );

  const iconG = createSVG('g', { transform: `translate(${-hw + 16}, 0)` });
  iconG.appendChild(
    createSVG('circle', {
      cx: 0,
      cy: -3.0,
      r: 3.2,
      fill: 'none',
      stroke: palette.pillIcon,
      'stroke-width': '2.0',
    })
  );
  iconG.appendChild(
    createSVG('path', {
      d: 'M -5.5 5.8 C -5.5 2.2 -3.0 0.8 0 0.8 C 3.0 0.8 5.5 2.2 5.5 5.8',
      fill: 'none',
      stroke: palette.pillIcon,
      'stroke-width': '2.0',
      'stroke-linecap': 'round',
    })
  );
  g.appendChild(iconG);

  const labelEl = createSVG('text', {
    x: 7,
    y: 4.1,
    'text-anchor': 'middle',
    fill: palette.pillText,
    'font-family': "'JetBrains Mono', monospace",
    'font-size': '12px',
    'font-weight': '700',
  });
  labelEl.textContent = text;
  g.appendChild(labelEl);

  return { group: g };
}

const VISUALIZER_3D_STYLES = `
        .lb-iso-visualizer .srv-meter-fill {
          transition: width 220ms cubic-bezier(0.22, 1, 0.36, 1), fill 200ms ease;
        }
        .lb-iso-visualizer * {
          box-sizing: border-box;
          user-select: none;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .lb-iso-visualizer {
          position: relative;
          width: 100%;
          min-height: 390px;
          height: 420px;
          overflow: hidden;
          background: #f6f1e6;
          font-family: 'JetBrains Mono', monospace;
          color: #23211e;
          transition: background 0.3s ease;
        }

        @media (min-width: 640px) {
          .lb-iso-visualizer {
            height: 580px;
          }
        }

        @media (min-width: 1024px) {
          .lb-iso-visualizer {
            height: 690px;
          }
        }

        .lb-iso-visualizer .paper-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          opacity: 0.22;
          background-image: radial-gradient(rgba(115, 100, 78, 0.14) 0.75px, transparent 0.75px);
          background-size: 14px 14px;
        }

        .lb-iso-visualizer .stage-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          cursor: default;
          touch-action: none;
          z-index: 5;
        }

        .lb-iso-visualizer .scene-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          overflow: visible;
        }

        .lb-iso-visualizer .hud-top-bar {
          position: absolute;
          top: 14px;
          left: 16px;
          right: 16px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          pointer-events: none;
          z-index: 30;
          flex-wrap: wrap;
        }

        .lb-iso-visualizer .hud-metrics-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          pointer-events: auto;
        }

        .lb-iso-visualizer .metric-card {
          background: rgba(253, 251, 247, 0.88);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(35, 33, 30, 0.12);
          border-radius: 12px;
          padding: 7px 13px;
          min-width: 112px;
          box-shadow: 0 4px 14px rgba(35, 33, 30, 0.05);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .lb-iso-visualizer .metric-card:hover {
          transform: translateY(-1px);
          border-color: rgba(35, 33, 30, 0.22);
        }

        .lb-iso-visualizer .metric-card__header {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 9.5px;
          font-weight: 700;
          color: #7a7367;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .lb-iso-visualizer .metric-card__value {
          font-size: 15px;
          font-weight: 800;
          color: #23211e;
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
        }

        .lb-iso-visualizer .metric-card__value--green {
          color: #15803d;
        }

        .lb-iso-visualizer .hud-actions-row {
          display: flex;
          align-items: center;
          gap: 7px;
          pointer-events: auto;
          flex-wrap: wrap;
        }

        .lb-iso-visualizer .neo-btn {
          background: rgba(253, 251, 247, 0.92);
          backdrop-filter: blur(10px);
          color: #23211e;
          border: 1px solid rgba(35, 33, 30, 0.16);
          border-radius: 10px;
          padding: 6px 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(35, 33, 30, 0.07);
          transition: transform 0.15s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
        }

        .lb-iso-visualizer .neo-btn:hover {
          background: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(35, 33, 30, 0.12);
        }

        .lb-iso-visualizer .neo-btn:active {
          transform: translateY(0px) scale(0.97);
        }

        .lb-iso-visualizer .neo-btn--active {
          background: #f5d376;
        }

        .lb-iso-visualizer .neo-btn--accent {
          background: #fde5d9;
        }

        .lb-iso-visualizer .neo-btn--accent:hover {
          background: #fbd5c2;
        }

        .lb-iso-visualizer .stepper-group {
          display: inline-flex;
          align-items: center;
          background: #fdfbf7;
          border: 1.5px solid #23211e;
          border-radius: 10px;
          overflow: hidden;
        }

        .lb-iso-visualizer .stepper-label {
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 800;
          color: #23211e;
          background: #f4eee1;
          border-right: 1px solid #23211e;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .lb-iso-visualizer .stepper-btn {
          padding: 5px 9px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
          font-weight: 800;
          color: #23211e;
          background: #fdfbf7;
          border: none;
          border-right: 1px solid #23211e;
          cursor: pointer;
          transition: background-color 0.12s ease;
        }

        .lb-iso-visualizer .stepper-btn:last-child {
          border-right: none;
        }

        .lb-iso-visualizer .stepper-btn:hover:not(:disabled) {
          background: #f3ce75;
        }

        .lb-iso-visualizer .stepper-btn:disabled {
          opacity: 0.38;
          cursor: not-allowed;
        }

        .lb-iso-visualizer .rps-group {
          display: inline-flex;
          background: #efe9dc;
          border: 1.5px solid #23211e;
          border-radius: 10px;
          overflow: hidden;
        }

        .lb-iso-visualizer .rps-btn {
          padding: 5.5px 9px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          color: #4d473e;
          background: transparent;
          border: none;
          border-right: 1px solid #23211e;
          cursor: pointer;
          transition: background-color 0.12s ease, color 0.12s ease;
        }

        .lb-iso-visualizer .rps-btn:last-child {
          border-right: none;
        }

        .lb-iso-visualizer .rps-btn:hover {
          background: #f9f3e3;
          color: #23211e;
        }

        .lb-iso-visualizer .rps-btn.active {
          background: #f3ce75;
          color: #23211e;
          font-weight: 800;
        }

        .lb-iso-visualizer .hud-bottom-legend {
          position: absolute;
          left: 18px;
          bottom: 14px;
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 11.5px;
          font-weight: 600;
          color: #665f54;
          z-index: 25;
          pointer-events: none;
        }

        .lb-iso-visualizer .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .lb-iso-visualizer .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid #23211e;
          display: inline-block;
        }

        .lb-iso-visualizer .legend-dot--req {
          background: #f97316;
        }

        .lb-iso-visualizer .legend-dot--res {
          background: #22c55e;
        }

        .lb-iso-visualizer .legend-dot--hand {
          background: #f8fafc;
          border-color: #0ea5e9;
        }

        .lb-iso-visualizer .hud-zoom-controls {
          position: absolute;
          right: 18px;
          bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 25;
          pointer-events: auto;
        }

        .lb-iso-visualizer .zoom-pill {
          display: inline-flex;
          align-items: center;
          background: rgba(253, 251, 247, 0.92);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(35, 33, 30, 0.16);
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(35, 33, 30, 0.07);
          overflow: hidden;
        }

        .lb-iso-visualizer .zoom-btn {
          padding: 5px 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 800;
          color: #23211e;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background-color 0.12s ease;
        }

        .lb-iso-visualizer .zoom-btn:hover:not(:disabled) {
          background: rgba(35, 33, 30, 0.06);
        }

        .lb-iso-visualizer .zoom-btn:disabled {
          opacity: 0.32;
          cursor: not-allowed;
        }

        @media (max-width: 639px) {
          .lb-iso-visualizer .hud-top-bar {
            top: 8px;
            left: 8px;
            right: 8px;
          }
          .lb-iso-visualizer .hud-metrics-row {
            gap: 5px;
            flex-wrap: nowrap;
            overflow-x: auto;
            max-width: 100%;
            scrollbar-width: none;
            -ms-overflow-style: none;
            padding-bottom: 2px;
          }
          .lb-iso-visualizer .hud-metrics-row::-webkit-scrollbar {
            display: none;
          }
          .lb-iso-visualizer .metric-card {
            padding: 4px 9px;
            min-width: auto;
            flex-shrink: 0;
            border-radius: 8px;
          }
          .lb-iso-visualizer .metric-card__header {
            font-size: 7.5px;
            gap: 3.5px;
          }
          .lb-iso-visualizer .metric-card__value {
            font-size: 11.5px;
          }
          .lb-iso-visualizer .hud-bottom-legend {
            left: 10px;
            bottom: 10px;
            gap: 8px;
            font-size: 9.5px;
          }
          .lb-iso-visualizer .legend-dot {
            width: 8px;
            height: 8px;
          }
          .lb-iso-visualizer .hud-zoom-controls {
            right: 10px;
            bottom: 10px;
            gap: 5px;
          }
          .lb-iso-visualizer .zoom-btn {
            padding: 4px 8px;
            font-size: 11px;
          }
          .lb-iso-visualizer .zoom-readout {
            padding: 4px 6px;
            min-width: 42px;
            font-size: 10px;
          }
          .lb-iso-visualizer .hud-fit-text-full {
            display: none;
          }
          .lb-iso-visualizer .hud-fit-text-short {
            display: inline;
          }
        }

        @media (min-width: 640px) {
          .lb-iso-visualizer .hud-fit-text-short {
            display: none;
          }
        }

        .lb-iso-visualizer .zoom-readout {
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 700;
          border-left: 1px solid rgba(35, 33, 30, 0.12);
          border-right: 1px solid rgba(35, 33, 30, 0.12);
          min-width: 54px;
          text-align: center;
          font-variant-numeric: tabular-nums;
          cursor: pointer;
        }

        .lb-iso-visualizer .icon-only-btn {
          width: 30px;
          height: 30px;
          padding: 0 !important;
          justify-content: center;
        }

        .lb-iso-visualizer .icon-only-btn:disabled {
          opacity: 0.35;
          cursor: default;
          transform: none !important;
        }

        .lb-iso-visualizer .iso-interactive-node {
          cursor: grab;
        }

        .lb-iso-visualizer .iso-interactive-node:active {
          cursor: grabbing;
        }

        /* Clean Matte Dark Mode Overrides (Solid Colors, Zero Dot Glow) */
        .lb-iso-visualizer.lb-theme-dark {
          background: #13161f;
          color: #f8fafc;
        }

        .lb-iso-visualizer.lb-theme-dark .paper-grain {
          opacity: 0.25;
          background-image: radial-gradient(rgba(148, 163, 184, 0.10) 0.75px, transparent 0.75px);
        }

        .lb-iso-visualizer.lb-theme-dark .metric-card {
          background: rgba(24, 28, 39, 0.88);
          border-color: rgba(148, 163, 184, 0.14);
          box-shadow: 0 4px 14px rgba(4, 6, 12, 0.35);
        }

        .lb-iso-visualizer.lb-theme-dark .metric-card:hover {
          border-color: rgba(148, 163, 184, 0.26);
        }

        .lb-iso-visualizer.lb-theme-dark .metric-card__header {
          color: #94a3b8;
        }

        .lb-iso-visualizer.lb-theme-dark .metric-card__value {
          color: #f8fafc;
        }

        .lb-iso-visualizer.lb-theme-dark #metric-dns {
          color: #f3c35c;
        }

        .lb-iso-visualizer.lb-theme-dark #metric-connect {
          color: #7aa2f7;
        }

        .lb-iso-visualizer.lb-theme-dark #metric-server {
          color: #a78bfa;
        }

        .lb-iso-visualizer.lb-theme-dark #metric-rps {
          color: #f97352;
        }

        .lb-iso-visualizer.lb-theme-dark .metric-card__value--green {
          color: #4ade80;
        }

        .lb-iso-visualizer.lb-theme-dark .neo-btn {
          background: rgba(24, 28, 39, 0.90);
          color: #e2e8f0;
          border-color: rgba(148, 163, 184, 0.18);
          box-shadow: 0 3px 10px rgba(4, 6, 12, 0.35);
        }

        .lb-iso-visualizer.lb-theme-dark .neo-btn:hover:not(:disabled) {
          background: #232939;
          border-color: rgba(148, 163, 184, 0.34);
          color: #ffffff;
        }

        .lb-iso-visualizer.lb-theme-dark .neo-btn:active:not(:disabled) {
          transform: scale(0.97);
        }

        .lb-iso-visualizer.lb-theme-dark .hud-bottom-legend {
          color: #94a3b8;
        }

        .lb-iso-visualizer.lb-theme-dark .legend-dot {
          border-color: #111318;
        }

        .lb-iso-visualizer.lb-theme-dark .legend-dot--req {
          background: #f97352;
        }

        .lb-iso-visualizer.lb-theme-dark .legend-dot--res {
          background: #4ade80;
        }

        .lb-iso-visualizer.lb-theme-dark .legend-dot--hand {
          background: #1c202b;
          border-color: #60a5fa;
        }

        .lb-iso-visualizer.lb-theme-dark .zoom-pill {
          background: rgba(24, 28, 39, 0.90);
          border-color: rgba(148, 163, 184, 0.18);
          box-shadow: 0 3px 10px rgba(4, 6, 12, 0.35);
        }

        .lb-iso-visualizer.lb-theme-dark .zoom-btn {
          color: #e2e8f0;
        }

        .lb-iso-visualizer.lb-theme-dark .zoom-btn:hover:not(:disabled) {
          background: rgba(148, 163, 184, 0.12);
        }

        .lb-iso-visualizer.lb-theme-dark .zoom-readout {
          color: #f8fafc;
          border-left-color: rgba(148, 163, 184, 0.14);
          border-right-color: rgba(148, 163, 184, 0.14);
        }
`;

// ============================================================================
// PLAIN REACT 18 COMPONENT
// ============================================================================
export const LoadBalancerVisualizer = memo(function LoadBalancerVisualizer({ theme, onThemeChange } = {}) {
  const isControlledTheme = theme === 'light' || theme === 'dark';
  const [internalTheme, setInternalTheme] = useState(() => {
    if (theme === 'dark' || theme === 'light') return theme;
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  const activeTheme = isControlledTheme ? theme : internalTheme;
  const isDark = activeTheme === 'dark';

  const handleSetTheme = useCallback(
    (nextMode) => {
      const normalized = nextMode === 'dark' ? 'dark' : 'light';
      if (!isControlledTheme) {
        setInternalTheme(normalized);
      }
      if (typeof onThemeChange === 'function') {
        onThemeChange(normalized);
      }
    },
    [isControlledTheme, onThemeChange]
  );

  const handleToggleTheme = useCallback(() => {
    handleSetTheme(activeTheme === 'dark' ? 'light' : 'dark');
  }, [activeTheme, handleSetTheme]);

  const initialThemeRef = useRef(activeTheme);
  const themeCallbacksRef = useRef({
    setTheme: handleSetTheme,
    toggleTheme: handleToggleTheme,
  });
  themeCallbacksRef.current = {
    setTheme: handleSetTheme,
    toggleTheme: handleToggleTheme,
  };
  const engineApiRef = useRef(null);

  const rootRef = useRef(null);
  const stageContainerRef = useRef(null);
  const svgElRef = useRef(null);

  const countClientsRef = useRef(null);
  const countServersRef = useRef(null);
  const btnRemoveClientRef = useRef(null);
  const btnAddClientRef = useRef(null);
  const btnRemoveServerRef = useRef(null);
  const btnAddServerRef = useRef(null);
  const btnAlgoRef = useRef(null);
  const btnAlgoLabelRef = useRef(null);
  const btnBurstRef = useRef(null);
  const btnPauseRef = useRef(null);
  const btnPauseLabelRef = useRef(null);
  const btnZoomInRef = useRef(null);
  const btnZoomOutRef = useRef(null);
  const zoomReadoutRef = useRef(null);
  const btnFitRef = useRef(null);
  const btnResetLayoutRef = useRef(null);
  const metricTotalReqsRef = useRef(null);
  const metricDispatchRef = useRef(null);
  const metricServerExecRef = useRef(null);
  const metricRpsRef = useRef(null);
  const metricTotalRttRef = useRef(null);
  const rpsBtnRefs = useRef([]);

  useEffect(() => {
    const svgEl = svgElRef.current;
    const stageContainer = stageContainerRef.current;
    if (!svgEl || !stageContainer) return;

    // Load JetBrains Mono font stylesheet once if not already present
    if (!document.querySelector('link[data-lb-font="jetbrains-mono"]')) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700;800&display=swap';
      fontLink.setAttribute('data-lb-font', 'jetbrains-mono');
      document.head.appendChild(fontLink);
    }

    const STATE = createInitialState();
    let currentThemeMode = initialThemeRef.current === 'dark' ? 'dark' : 'light';
    let palette = THEMES[currentThemeMode];
    let currentAlgoIdx = 0;
    let targetRPS = 12;
    let isPaused = false;
    const lastHud = { reqs: '', disp: '', srv: '', rps: '', rtt: '', rttOk: null };
    const syncHudMetrics = (st) => {
      const inLive = st.clusterMode === 'live';
      const online = inLive ? Boolean(st.lbOnline) : true;
      const healthyCnt = (st.servers || []).filter((s) => s.status === 'healthy').length;
      const totalReqs = st.metrics?.totalRequests ?? 0;
      const failedReqs = st.metrics?.failedRequests ?? 0;
      const activeConns = st.metrics?.activeConnectionsTotal ?? 0;
      const rpsVal = (st.isRunning && online) ? (st.metrics?.currentRps ?? (inLive ? 0 : st.targetRps)) : 0;
      const avgRtt = Math.round(st.metrics?.avgLatency || 0);
      const srvExec = Math.round(st.metrics?.serverExec ?? (inLive ? 4 : 42));
      const lbDisp = Math.round(st.metrics?.lbDispatch ?? (inLive ? 2 : 24));

      const reqsStr = failedReqs > 0
        ? `${totalReqs.toLocaleString()} (${failedReqs} err)`
        : `${totalReqs.toLocaleString()} reqs`;
      const dispStr = online ? `${lbDisp} ms · ${activeConns}c` : 'OFFLINE';
      const srvStr = !online ? 'PAUSED' : (healthyCnt > 0 ? `${srvExec} ms` : 'ERR 503');
      const rpsStr = `${rpsVal} req/s`;
      const rttStr = !online ? 'LB OFFLINE' : (healthyCnt > 0 ? `${avgRtt} ms` : 'NO NODES');
      const rttOk = online && healthyCnt > 0;

      if (metricTotalReqsRef.current && lastHud.reqs !== reqsStr) {
        lastHud.reqs = reqsStr;
        metricTotalReqsRef.current.textContent = reqsStr;
      }
      if (metricDispatchRef.current && lastHud.disp !== dispStr) {
        lastHud.disp = dispStr;
        metricDispatchRef.current.textContent = dispStr;
      }
      if (metricServerExecRef.current && lastHud.srv !== srvStr) {
        lastHud.srv = srvStr;
        metricServerExecRef.current.textContent = srvStr;
      }
      if (metricRpsRef.current && lastHud.rps !== rpsStr) {
        lastHud.rps = rpsStr;
        metricRpsRef.current.textContent = rpsStr;
      }
      if (metricTotalRttRef.current) {
        if (lastHud.rtt !== rttStr) {
          lastHud.rtt = rttStr;
          metricTotalRttRef.current.textContent = rttStr;
        }
        if (lastHud.rttOk !== rttOk) {
          lastHud.rttOk = rttOk;
          metricTotalRttRef.current.classList.toggle('metric-card__value--green', rttOk);
        }
      }
    };
    if (IS_LIVE_BACKEND) {
      const liveSrvs = useSimulationStore.getState().servers;
      if (liveSrvs && liveSrvs.length > 0) {
        STATE.servers = liveSrvs.map((s) => ({
          id: s.id,
          name: s.name,
          ip: s.publicIp || s.ip || '52.172.229.225:5001',
          publicIp: s.publicIp || s.ip || '52.172.229.225:5001',
          privateIp: s.privateIp || '10.0.1.10',
          cpu: s.cpu ?? 25,
          connections: s.activeConnections ?? 0,
          totalRequests: s.totalRequests ?? 0,
          avgLatency: s.avgLatency ?? 0,
          healthy: s.status === 'healthy',
          status: s.status || 'healthy',
          halfSize: 1.38,
          cornerR: 0.42,
          height: 58,
          u: 0,
          v: 0,
        }));
      }
      isPaused = !useSimulationStore.getState().isRunning;
      targetRPS = useSimulationStore.getState().targetRps;
      const initAlgo = useSimulationStore.getState().algorithm;
      currentAlgoIdx = initAlgo === 'LEAST_CONNECTIONS' ? 1 : initAlgo === 'IP_HASH' ? 2 : 0;
      syncHudMetrics(useSimulationStore.getState());
    }
    let rrCounter = 0;
    let lcTieCursor = 0;

    const ROUTE_TABLES = [];
    const wireGlows = [];
    const clientRouteIndices = [];
    const serverRouteIndices = [];

    const nodeBounces = new Map();
    const nodeHovers = new Map();
    let hoveredNodeId = null;
    let draggingNodeInfo = null;
    const clientNodeRefs = new Map();
    const serverNodeRefs = new Map();
    let lbNodeRef = null;
    let lbSwitchingArcEl = null;
    let currentLbOnline = IS_LIVE_BACKEND ? useSimulationStore.getState().lbOnline : true;
    let wiresGroupEl = null;
    let blocksGroupEl = null;
    let pillsGroupEl = null;

    const introState = {
      active: !hasPlayedInitialDrop,
      elapsed: 0,
      duration: 1.48,
      items: [],
      wireReveals: [],
    };
    const resetTargets = new Map();
    const nodeDragHandlers = new Map();

    const SVG_PACKET_POOL_SIZE = 280;
    const svgPacketNodes = [];
    const svgPacketMeta = [];

    const SVG_RIPPLE_POOL_SIZE = 48;
    const svgRippleNodes = [];
    const activeRipples = [];

    const SVG_TOAST_POOL_SIZE = 18;
    const svgToastNodes = [];
    const activeToasts = [];

    const activeFloorWaves = [];
    const svgFloorWaveNodes = [];

    const MAX_PACKETS = 2048;
    const pktActive = new Uint8Array(MAX_PACKETS);
    const activeSlots = [];
    const pktSlotPos = new Int16Array(MAX_PACKETS).fill(-1);
    const pktRoute = new Uint16Array(MAX_PACKETS);
    const pktType = new Uint8Array(MAX_PACKETS); // 0 = coral request, 1 = green response, 2 = handshake, 3 = crimson error
    const pktDir = new Int8Array(MAX_PACKETS); // +1 forward, -1 reverse
    const pktU = new Float32Array(MAX_PACKETS); // 0.0 -> 1.0 normalized arc-length
    const pktSpeed = new Float32Array(MAX_PACKETS);
    const pktClientOrigin = new Uint8Array(MAX_PACKETS);
    const pktTargetSrv = new Int16Array(MAX_PACKETS);
    const pktFlags = new Uint8Array(MAX_PACKETS); // bit 1: directNoLb, bit 2: isErr
    const pktLatencyMs = new Float32Array(MAX_PACKETS);

    function activateSlot(slot) {
      if (pktActive[slot]) return;
      pktActive[slot] = 1;
      pktSlotPos[slot] = activeSlots.length;
      activeSlots.push(slot);
    }

    function deactivateSlot(slot) {
      if (!pktActive[slot]) return;
      pktActive[slot] = 0;
      const pos = pktSlotPos[slot];
      const last = activeSlots.pop();
      if (last !== undefined && last !== slot && pos >= 0) {
        activeSlots[pos] = last;
        pktSlotPos[last] = pos;
      }
      pktSlotPos[slot] = -1;
    }

    const livePacketQueue = [];
    const clientCooldowns = new Float32Array(8);

    let pktWriteCursor = 0;
    const MIN_SAME_LANE_HEADWAY = 0.14;

    const camera = {
      cx: 820,
      cy: 485,
      zoom: 1.0,
      minZoom: 1.0,
      maxZoom: 3.5,
    };
    const targetCamera = {
      cx: 820,
      cy: 485,
      zoom: 1.0,
    };

    let viewportW = stageContainer.clientWidth || window.innerWidth;
    let viewportH = stageContainer.clientHeight || window.innerHeight;
    let baseScale = 1.0;

    function getCurrentViewBoxBounds() {
      const effScale = baseScale * camera.zoom;
      const vw = viewportW / effScale;
      const vh = viewportH / effScale;
      return {
        vx: camera.cx - vw / 2,
        vy: camera.cy - vh / 2,
        vw,
        vh,
        effScale,
      };
    }

    function applyViewBox() {
      if (camera.zoom <= 1.001) {
        camera.zoom = 1.0;
        camera.cx = 820;
        camera.cy = 485;
      }
      const { vx, vy, vw, vh } = getCurrentViewBoxBounds();

      svgEl.setAttribute('viewBox', `${vx.toFixed(3)} ${vy.toFixed(3)} ${vw.toFixed(3)} ${vh.toFixed(3)}`);
      if (zoomReadoutRef.current) {
        zoomReadoutRef.current.textContent = `${Math.round(targetCamera.zoom * 100)}%`;
      }
      if (btnZoomOutRef.current) {
        btnZoomOutRef.current.disabled = targetCamera.zoom <= 1.001;
      }
      if (btnZoomInRef.current) {
        btnZoomInRef.current.disabled = targetCamera.zoom >= camera.maxZoom - 0.01;
      }
      if (!draggingNodeInfo) {
        stageContainer.style.cursor = targetCamera.zoom > 1.01 ? 'grab' : 'default';
      }
    }

    function syncViewportSize() {
      viewportW = stageContainer.clientWidth || window.innerWidth;
      viewportH = stageContainer.clientHeight || window.innerHeight;
      const fitW = viewportW < 640 ? 1200 : 1480;
      const fitH = viewportW < 640 ? 740 : 890;
      baseScale = Math.min(viewportW / fitW, viewportH / fitH);
      applyViewBox();
    }

    function syncResetLayoutBtn() {
      if (btnResetLayoutRef.current) {
        btnResetLayoutRef.current.disabled = persistedNodeCoords.size === 0 && resetTargets.size === 0;
      }
    }

    function getDefaultNodePosition(nodeId) {
      if (nodeId === 'lb') return { u: 0, v: 0 };
      const nC = STATE.clients.length;
      const cIdx = STATE.clients.findIndex((c) => c.id === nodeId);
      if (cIdx !== -1) {
        const clientSpacingU = nC <= 3 ? 3.5 : nC === 4 ? 3.15 : nC === 5 ? 2.75 : 2.4;
        const cMid = (nC - 1) / 2;
        return { u: (cIdx - cMid) * clientSpacingU, v: -5.85 };
      }
      const nS = STATE.servers.length;
      const sIdx = STATE.servers.findIndex((s) => s.id === nodeId);
      if (sIdx !== -1) {
        const serverSpacingU = nS <= 3 ? 3.7 : nS === 4 ? 3.2 : 2.8;
        const sMid = (nS - 1) / 2;
        return { u: (sIdx - sMid) * serverSpacingU, v: 5.85 };
      }
      return { u: 0, v: 0 };
    }

    function resetNodesSmoothly() {
      persistedNodeCoords.clear();
      const allNodes = [STATE.loadBalancer, ...STATE.clients, ...STATE.servers];
      allNodes.forEach((node) => {
        const def = getDefaultNodePosition(node.id);
        if (Math.hypot(node.u - def.u, node.v - def.v) > 0.01) {
          resetTargets.set(node.id, { node, targetU: def.u, targetV: def.v });
        }
      });
      syncResetLayoutBtn();
    }

    function resetCameraFit() {
      targetCamera.cx = 820;
      targetCamera.cy = 485;
      targetCamera.zoom = 1.0;
      applyViewBox();
    }

    function spawnPortRipple(x, y, colorHex, maxR = 20) {
      let node = null;
      for (let i = 0; i < SVG_RIPPLE_POOL_SIZE; i++) {
        if (!svgRippleNodes[i].inUse) {
          node = svgRippleNodes[i];
          break;
        }
      }
      if (!node) return;
      node.inUse = true;
      node.x = x;
      node.y = y;
      node.color = colorHex;
      node.age = 0;
      node.duration = 0.42;
      node.maxR = maxR;
      node.el.setAttribute('cx', x.toFixed(1));
      node.el.setAttribute('cy', y.toFixed(1));
      node.el.setAttribute('stroke', colorHex);
      node.el.setAttribute('display', 'inline');
      activeRipples.push(node);
    }

    function spawnMacroToast(x, y, text, bgHex = '#fdfbf7', textHex = '#23211e') {
      let node = null;
      for (let i = 0; i < SVG_TOAST_POOL_SIZE; i++) {
        if (!svgToastNodes[i].inUse) {
          node = svgToastNodes[i];
          break;
        }
      }
      if (!node) return;
      node.inUse = true;
      node.x = x;
      node.y = y;
      node.age = 0;
      node.duration = 0.85;

      const w = Math.max(68, text.length * 7.2 + 18);
      node.rect.setAttribute('x', (-w / 2).toFixed(1));
      node.rect.setAttribute('width', w.toFixed(1));
      node.rect.setAttribute('fill', bgHex);
      node.label.setAttribute('fill', textHex);
      node.label.textContent = text;
      node.g.setAttribute('transform', `translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(0.7)`);
      node.g.setAttribute('opacity', '1');
      node.g.setAttribute('display', 'inline');
      activeToasts.push(node);
    }

    function spawnIsometricFloorWave(u, v, colorHex = '#e6b84e') {
      for (let i = 0; i < svgFloorWaveNodes.length; i++) {
        const w = svgFloorWaveNodes[i];
        if (!w.inUse) {
          w.inUse = true;
          w.u = u;
          w.v = v;
          w.age = 0;
          w.duration = 0.95;
          w.el.setAttribute('stroke', colorHex);
          w.el.setAttribute('display', 'inline');
          activeFloorWaves.push(w);
          break;
        }
      }
    }

    function getLiveNodeDelta(node) {
      if (!node || node._buildU === undefined) return { dx: 0, dy: 0 };
      const du = node.u - node._buildU;
      const dv = node.v - node._buildV;
      return {
        dx: (du - dv) * TILE_W,
        dy: (du + dv) * TILE_H,
      };
    }

    function getLiveNodeTopCenter(nodeId) {
      if (nodeId === 'lb' && lbNodeRef) {
        const d = getLiveNodeDelta(STATE.loadBalancer);
        return { x: lbNodeRef.centerTop.x + d.dx, y: lbNodeRef.centerTop.y + d.dy };
      }
      if (serverNodeRefs.has(nodeId)) {
        const sRef = serverNodeRefs.get(nodeId);
        const d = getLiveNodeDelta(sRef.srv);
        return { x: sRef.block.centerTop.x + d.dx, y: sRef.block.centerTop.y + d.dy };
      }
      return { x: ORIGIN_X, y: ORIGIN_Y };
    }

    let lbLightPulseAge = 0;

    function triggerLBSwitchingArc() {
      if (!lbNodeRef) return;
      lbLightPulseAge = 0.28;
    }

    function triggerNodeImpact(nodeId, portPt, rippleColor = palette.rippleReq, toastText = null) {
      const now = performance.now();
      let b = nodeBounces.get(nodeId);
      if (!b) {
        b = { offset: 0, vel: 0, flash: 0, lastTrigger: 0, lastToast: 0 };
        nodeBounces.set(nodeId, b);
      }
      if (now - b.lastTrigger > 70) {
        b.vel = 68;
        b.flash = 1.0;
        b.lastTrigger = now;
        if (portPt) {
          spawnPortRipple(portPt.x, portPt.y, rippleColor, nodeId === 'lb' ? 21 : 18);
        }
        if (toastText && now - b.lastToast > 520 && serverNodeRefs.has(nodeId)) {
          b.lastToast = now;
          const liveTop = getLiveNodeTopCenter(nodeId);
          spawnMacroToast(
            liveTop.x,
            liveTop.y - 38,
            toastText,
            palette.toastOkBg,
            palette.toastOkText
          );
        }
      }
    }

    function pulseWireGlow(routeIdx, colorHex = palette.wireGlow) {
      const wg = wireGlows[routeIdx];
      if (!wg) return;
      wg.intensity = 1.0;
      wg.el.setAttribute('stroke', colorHex);
    }

    function updateMacroAndSpringAnimations(dt, nowMs = performance.now()) {
      const stiffness = 420;
      const damping = 22;
      const hoverRate = 1 - Math.exp(-15 * dt);

      // Smooth hover & drag lift interpolation for every node
      const allHoverIds = ['lb', ...STATE.clients.map((c) => c.id), ...STATE.servers.map((s) => s.id)];
      allHoverIds.forEach((nodeId) => {
        const isDragged = draggingNodeInfo && draggingNodeInfo.id === nodeId;
        const isHovered = hoveredNodeId === nodeId;
        const targetLift = isDragged ? -11 : isHovered ? -4.5 : 0;
        const targetGlow = isDragged ? 0.95 : isHovered ? 0.55 : 0;
        let hv = nodeHovers.get(nodeId);
        if (!hv) {
          hv = { lift: 0, glow: 0 };
          nodeHovers.set(nodeId, hv);
        }
        hv.lift += (targetLift - hv.lift) * hoverRate;
        hv.glow += (targetGlow - hv.glow) * hoverRate;
      });

      nodeBounces.forEach((b, nodeId) => {
        if (Math.abs(b.offset) < 0.02 && Math.abs(b.vel) < 0.1 && b.flash <= 0.01) {
          b.offset = 0;
          b.vel = 0;
          b.flash = 0;
          return;
        }

        const force = -stiffness * b.offset - damping * b.vel;
        b.vel += force * dt;
        b.offset += b.vel * dt;
        b.flash = Math.max(0, b.flash - dt * 3.2);
      });

      // Apply combined bounce + hover lift transforms smoothly
      if (lbNodeRef && (!introState || !introState.active)) {
        const b = nodeBounces.get('lb');
        const hv = nodeHovers.get('lb');
        const dy = (b ? b.offset : 0) + (hv ? hv.lift : 0);
        const flash = b ? b.flash : 0;
        const idleBreath = currentLbOnline && !isPaused ? 0.14 + 0.08 * Math.sin(nowMs * 0.0032) : 0;
        const haloOp = Math.max(flash * 0.72, hv ? hv.glow * 0.55 : 0, idleBreath);
        lbNodeRef.bounceG.setAttribute('transform', `translate(0, ${dy.toFixed(2)})`);
        lbNodeRef.haloRing.setAttribute('opacity', haloOp.toFixed(2));
      }

      STATE.servers.forEach((srv) => {
        if (introState && introState.active) return;
        const sRef = serverNodeRefs.get(srv.id);
        if (!sRef) return;
        const b = nodeBounces.get(srv.id);
        const hv = nodeHovers.get(srv.id);
        const dy = (b ? b.offset : 0) + (hv ? hv.lift : 0);
        const flash = b ? b.flash : 0;
        const haloOp = Math.max(flash * 0.75, hv ? hv.glow * 0.55 : 0);
        sRef.block.bounceG.setAttribute('transform', `translate(0, ${dy.toFixed(2)})`);
        sRef.block.haloRing.setAttribute('opacity', haloOp.toFixed(2));
        if (sRef.block.led1 && sRef.srv.healthy) {
          const ledCol = flash > 0.35 ? palette.srvLedFlash1 : palette.srvLedIdle;
          sRef.block.led1.setAttribute('fill', ledCol);
          sRef.block.led2.setAttribute('fill', flash > 0.55 ? palette.srvLedFlash2 : palette.srvLedIdle);
        }
      });

      STATE.clients.forEach((client) => {
        if (introState && introState.active) return;
        const cRef = clientNodeRefs.get(client.id);
        if (!cRef) return;
        const b = nodeBounces.get(client.id);
        const hv = nodeHovers.get(client.id);
        const dy = (b ? b.offset * 0.55 : 0) + (hv ? hv.lift * 0.85 : 0);
        const flash = b ? b.flash : 0;
        cRef.laptop.bounceG.setAttribute('transform', `translate(0, ${dy.toFixed(2)})`);
        if (cRef.laptop.heroBannerPath) {
          cRef.laptop.heroBannerPath.setAttribute(
            'fill',
            flash > 0.30 ? palette.lapHeroFlash : palette.lapHero
          );
        }
      });

      // Decay active wire glow overlays removed — clean solid wires

      if (lbNodeRef?.lbLights && currentLbOnline) {
        if (lbLightPulseAge > 0) {
          lbLightPulseAge = Math.max(0, lbLightPulseAge - dt);
        }
        const phase = Math.floor(performance.now() / 160);
        const pulseBoost = lbLightPulseAge > 0;
        lbNodeRef.lbLights.portLeds.forEach((p, pIdx) => {
          const lit = pulseBoost ? ((pIdx + phase) % 2 === 0) : (pIdx === (phase % lbNodeRef.lbLights.portLeds.length));
          p.el.setAttribute('opacity', lit ? '1' : '0.42');
        });
        lbNodeRef.lbLights.hbLed1.setAttribute('opacity', pulseBoost || phase % 4 === 0 ? '1' : '0.45');
        lbNodeRef.lbLights.hbLed2.setAttribute('opacity', pulseBoost || phase % 4 === 2 ? '1' : '0.45');
      }

      for (let i = activeRipples.length - 1; i >= 0; i--) {
        const rp = activeRipples[i];
        rp.age += dt;
        if (rp.age >= rp.duration) {
          rp.inUse = false;
          rp.el.setAttribute('display', 'none');
          activeRipples.splice(i, 1);
          continue;
        }
        const p = rp.age / rp.duration;
        const ease = 1 - Math.pow(1 - p, 3);
        const r = 4.5 + (rp.maxR - 4.5) * ease;
        rp.el.setAttribute('rx', r.toFixed(1));
        rp.el.setAttribute('ry', (r * 0.56).toFixed(1));
        rp.el.setAttribute('opacity', ((1 - p) * 0.8).toFixed(2));
      }

      for (let i = activeToasts.length - 1; i >= 0; i--) {
        const t = activeToasts[i];
        t.age += dt;
        if (t.age >= t.duration) {
          t.inUse = false;
          t.g.setAttribute('display', 'none');
          activeToasts.splice(i, 1);
          continue;
        }
        const p = t.age / t.duration;
        const dy = -26 * (1 - Math.pow(1 - p, 2));
        const sc = p < 0.18 ? 0.75 + (p / 0.18) * 0.25 : 1.0;
        const op = p > 0.65 ? (1 - p) / 0.35 : 1.0;
        t.g.setAttribute('transform', `translate(${t.x.toFixed(1)}, ${(t.y + dy).toFixed(1)}) scale(${sc.toFixed(2)})`);
        t.g.setAttribute('opacity', op.toFixed(2));
      }

      for (let i = activeFloorWaves.length - 1; i >= 0; i--) {
        const fw = activeFloorWaves[i];
        fw.age += dt;
        if (fw.age >= fw.duration) {
          fw.inUse = false;
          fw.el.setAttribute('display', 'none');
          activeFloorWaves.splice(i, 1);
          continue;
        }
        const p = fw.age / fw.duration;
        const ease = 1 - Math.pow(1 - p, 2.5);
        const halfS = 1.6 + ease * 4.2;
        const pts = getIsoRoundedSquarePoints(fw.u, fw.v, halfS, halfS * 0.28, 0, 10);
        fw.el.setAttribute('d', pointsToClosedPath(pts));
        fw.el.setAttribute('opacity', ((1 - p) * 0.65).toFixed(2));
      }
    }

    function canSpawnOnRoute(routeIdx, dir) {
      for (let k = 0; k < activeSlots.length; k++) {
        const i = activeSlots[k];
        if (pktRoute[i] === routeIdx && pktDir[i] === dir) {
          if (dir === 1 && pktU[i] < MIN_SAME_LANE_HEADWAY) return false;
          if (dir === -1 && pktU[i] > 1.0 - MIN_SAME_LANE_HEADWAY) return false;
        }
      }
      return true;
    }

    function spawnPacket(
      routeIdx,
      type = 0,
      dir = 1,
      speedMultiplier = 1.0,
      originClientIdx = 0,
      ignoreHeadway = false,
      targetSrv = -1,
      flags = 0,
      latencyMs = 0
    ) {
      const route = ROUTE_TABLES[routeIdx];
      if (!route) return false;
      if (!ignoreHeadway && !canSpawnOnRoute(routeIdx, dir)) return false;

      let slot = -1;
      for (let i = 0; i < MAX_PACKETS; i++) {
        const idx = (pktWriteCursor + i) & (MAX_PACKETS - 1);
        if (pktActive[idx] === 0) {
          slot = idx;
          pktWriteCursor = (idx + 1) & (MAX_PACKETS - 1);
          break;
        }
      }
      if (slot === -1) return false;

      activateSlot(slot);
      pktRoute[slot] = routeIdx;
      pktType[slot] = type;
      pktDir[slot] = dir;
      pktU[slot] = dir === 1 ? 0.028 : 0.972;
      pktClientOrigin[slot] = originClientIdx;
      pktTargetSrv[slot] = targetSrv;
      pktFlags[slot] = flags;
      pktLatencyMs[slot] = latencyMs;

      const pxPerSec = 290 * speedMultiplier;
      pktSpeed[slot] = pxPerSec / Math.max(route.totalLen, 1);

      if (dir === 1 && routeIdx < STATE.clients.length) {
        const client = STATE.clients[routeIdx];
        if (client) {
          triggerNodeImpact(client.id, route.startPt, type === 3 ? '#ef4444' : palette.rippleReq);
          playDotIn(type === 2);
        }
      }
      return true;
    }

    function sampleRouteWithNormal(route, u) {
      const maxIdx = route.sampleCount - 1;
      const f = Math.min(maxIdx, Math.max(0, u * maxIdx));
      const i0 = f | 0;
      const i1 = Math.min(maxIdx, i0 + 1);
      const frac = f - i0;
      return {
        x: route.lutX[i0] + (route.lutX[i1] - route.lutX[i0]) * frac,
        y: route.lutY[i0] + (route.lutY[i1] - route.lutY[i0]) * frac,
        nx: route.normX[i0] + (route.normX[i1] - route.normX[i0]) * frac,
        ny: route.normY[i0] + (route.normY[i1] - route.normY[i0]) * frac,
      };
    }

    function computeDuplexPassingOffset(slotIdx, routeIdx, u, dir) {
      let maxAvoid = 0;
      const PASS_WINDOW = 0.16;

      for (let k = 0; k < activeSlots.length; k++) {
        const j = activeSlots[k];
        if (j === slotIdx) continue;
        if (pktRoute[j] === routeIdx && pktDir[j] !== dir) {
          const dist = Math.abs(u - pktU[j]);
          if (dist < PASS_WINDOW) {
            const bell = 0.5 * (1 + Math.cos(Math.PI * (dist / PASS_WINDOW)));
            if (bell > maxAvoid) maxAvoid = bell;
          }
        }
      }
      return dir * maxAvoid * 6.8;
    }

    function hashClientKey(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }

    function getActiveServerInFlight(srvIdx) {
      const targetRoute = serverRouteIndices[srvIdx];
      if (targetRoute === undefined) return 0;
      let count = 0;
      for (let k = 0; k < activeSlots.length; k++) {
        if (pktRoute[activeSlots[k]] === targetRoute) count++;
      }
      return count;
    }

    function pickHealthyServerIdx(clientIdx = 0) {
      const healthy = [];
      for (let i = 0; i < STATE.servers.length; i++) {
        if (STATE.servers[i].healthy) healthy.push(i);
      }
      if (healthy.length === 0) return -1;

      const algo = ALGORITHMS[currentAlgoIdx];
      if (algo === 'ROUND ROBIN') {
        const pick = healthy[rrCounter % healthy.length];
        rrCounter++;
        return pick;
      } else if (algo === 'LEAST CONN') {
        const inLiveMode = useSimulationStore.getState().clusterMode === 'live';
        let minLoad = Infinity;
        const loads = new Array(healthy.length);
        for (let i = 0; i < healthy.length; i++) {
          const sIdx = healthy[i];
          const liveLoad = getActiveServerInFlight(sIdx) + (inLiveMode ? (STATE.servers[sIdx].connections || 0) : 0);
          loads[i] = liveLoad;
          if (liveLoad < minLoad) minLoad = liveLoad;
        }
        const tied = [];
        for (let i = 0; i < healthy.length; i++) {
          if (loads[i] === minLoad) tied.push(healthy[i]);
        }
        if (tied.length === 1) return tied[0];
        const pick = tied[lcTieCursor % tied.length];
        lcTieCursor++;
        return pick;
      } else {
        const client = STATE.clients[clientIdx];
        const clientKey = client?.ip || client?.label || `client-${clientIdx}`;
        return healthy[hashClientKey(clientKey) % healthy.length];
      }
    }

    function clearAllPackets() {
      pktActive.fill(0);
      pktSlotPos.fill(-1);
      activeSlots.length = 0;
      livePacketQueue.length = 0;
      for (let i = 0; i < svgPacketNodes.length; i++) {
        if (svgPacketMeta[i]?.disp) {
          svgPacketNodes[i].setAttribute('display', 'none');
          svgPacketMeta[i].disp = false;
        }
      }
    }

    function refreshServerPillsUI() {
      STATE.servers.forEach((srv) => {
        const refs = serverNodeRefs.get(srv.id);
        if (!refs?.pill) return;
        const pillKey = srv.healthy
          ? `1:${srv.cpu}:${srv.totalRequests || 0}`
          : `0:${srv.status || 'offline'}:${srv.totalRequests || 0}`;
        if (srv._lastPillKey === pillKey) return;
        srv._lastPillKey = pillKey;
        const {
          ledSegments,
          leftVentSlots,
          ventSlots,
          cpuText,
          reqText,
          gearPath,
          gearHole,
          signalBars,
          toggleBg,
          toggleText,
          isDarkWall,
        } = refs.pill;

        if (!srv.healthy) {
          const offVentFill = isDarkWall ? '#302026' : '#b5afa6';
          const offVentLip = 'rgba(255,200,200,0.14)';
          const offSocketLed = '#3a2229';

          ledSegments?.forEach((seg) => seg.setAttribute('fill', offSocketLed));
          leftVentSlots?.forEach(({ slot, lip }) => {
            slot.setAttribute('fill', offVentFill);
            lip.setAttribute('stroke', offVentLip);
          });
          ventSlots?.forEach(({ slot, lip }) => {
            slot.setAttribute('fill', offVentFill);
            lip.setAttribute('stroke', offVentLip);
          });
          cpuText.textContent = srv.status === 'failed' ? 'CRASHED' : 'OFFLINE';
          cpuText.setAttribute('fill', palette.pillOfflineText);
          reqText.textContent = `${srv.totalRequests || 0} req`;
          reqText.setAttribute('fill', palette.srvOffSubtitle || palette.pillOfflineText);
          gearPath.setAttribute('fill', '#f87171');
          gearHole?.setAttribute('fill', isDarkWall ? '#20242e' : '#c5beb2');
          gearPath.classList.add('svg-gear-paused');
          signalBars?.forEach((led) => led.setAttribute('fill', '#fb7185'));
          toggleBg.setAttribute('fill', palette.pillToggleOffRefresh);
          toggleText.textContent = 'OFF';
        } else {
          const cpuVal = Math.max(0, Math.min(100, Math.round(srv.cpu || 0)));
          const barColor = cpuVal > 78 ? '#fb7185' : cpuVal > 58 ? '#f59e0b' : '#4ade80';
          const totalLeds = ledSegments?.length || 7;
          const litCount = Math.max(1, Math.round((cpuVal / 100) * totalLeds));
          const onVentFill = isDarkWall ? '#1b479e' : '#7699cf';
          const onVentLip = isDarkWall ? 'rgba(191, 219, 254, 0.25)' : 'rgba(255, 255, 255, 0.45)';
          const unlitLed = isDarkWall ? '#1e3259' : '#334155';

          ledSegments?.forEach((seg, sIdx) => {
            const segColor = sIdx >= 6 ? '#fb7185' : sIdx >= 4 ? '#f59e0b' : '#4ade80';
            seg.setAttribute('fill', sIdx < litCount ? segColor : unlitLed);
          });
          leftVentSlots?.forEach(({ slot, lip }) => {
            slot.setAttribute('fill', onVentFill);
            lip.setAttribute('stroke', onVentLip);
          });
          ventSlots?.forEach(({ slot, lip }) => {
            slot.setAttribute('fill', onVentFill);
            lip.setAttribute('stroke', onVentLip);
          });

          cpuText.textContent = `${cpuVal}%`;
          cpuText.setAttribute('fill', palette.srvTitle);
          reqText.textContent = `${srv.totalRequests || 0} req`;
          reqText.setAttribute('fill', palette.srvSubtitle || palette.srvTitle);
          gearPath.setAttribute('fill', palette.srvSubtitle || palette.srvTitle);
          gearHole?.setAttribute('fill', isDarkWall ? '#274787' : '#8eb1e6');
          gearPath.classList.remove('svg-gear-paused');

          if (signalBars?.length >= 2) {
            signalBars[0].setAttribute('fill', barColor);
            signalBars[1].setAttribute('fill', cpuVal >= 45 ? '#fbbf24' : '#38bdf8');
          }

          toggleBg.setAttribute('fill', palette.pillToggleOn);
          toggleText.textContent = 'ON';
        }
      });
    }

    function computePlanarManifoldLayout() {
      const savedLb = persistedNodeCoords.get('lb');
      STATE.loadBalancer.u = savedLb ? savedLb.u : 0;
      STATE.loadBalancer.v = savedLb ? savedLb.v : 0;

      const nC = STATE.clients.length;
      const clientSpacingU = nC <= 3 ? 3.5 : nC === 4 ? 3.15 : nC === 5 ? 2.75 : 2.4;
      const cMid = (nC - 1) / 2;

      STATE.clients.forEach((c, idx) => {
        const saved = persistedNodeCoords.get(c.id);
        c.u = saved ? saved.u : (idx - cMid) * clientSpacingU;
        c.v = saved ? saved.v : -5.85;
      });

      const nS = STATE.servers.length;
      const serverSpacingU = nS <= 3 ? 3.7 : nS === 4 ? 3.2 : 2.8;
      const sMid = (nS - 1) / 2;

      STATE.servers.forEach((s, idx) => {
        const saved = persistedNodeCoords.get(s.id);
        s.u = saved ? saved.u : (idx - sMid) * serverSpacingU;
        s.v = saved ? saved.v : 5.85;
      });

      if (countClientsRef.current) {
        countClientsRef.current.textContent = `${nC} Device${nC > 1 ? 's' : ''}`;
      }
      if (countServersRef.current) {
        countServersRef.current.textContent = `${nS} Server${nS > 1 ? 's' : ''}`;
      }
      if (btnRemoveClientRef.current) btnRemoveClientRef.current.disabled = nC <= 1;
      if (btnAddClientRef.current) btnAddClientRef.current.disabled = nC >= 6;
      if (btnRemoveServerRef.current) btnRemoveServerRef.current.disabled = nS <= 1;
      if (btnAddServerRef.current) btnAddServerRef.current.disabled = nS >= 5;
    }

    function toggleServerHealth(srvIdx, forceState = undefined) {
      const srv = STATE.servers[srvIdx];
      if (!srv) return;
      // In Live Azure mode, only authoritative health telemetry (forceState boolean) may change VM health.
      if (typeof forceState !== 'boolean' && useSimulationStore.getState().clusterMode === 'live') {
        return;
      }
      srv.healthy = typeof forceState === 'boolean' ? forceState : !srv.healthy;
      if (IS_LIVE_BACKEND && typeof forceState !== 'boolean') {
        useSimulationStore.getState().toggleServerStatus(srv.storeId || srv.id);
      }

      const refs = serverNodeRefs.get(srv.id);
      if (refs) {
        refs.block.topPath.setAttribute('fill', srv.healthy ? 'url(#srv-top-grad)' : 'url(#srv-off-top-grad)');
        refs.block.wallPath.setAttribute('fill', srv.healthy ? 'url(#srv-wall-grad)' : 'url(#srv-off-wall-grad)');
        const nextBlockStroke = srv.healthy ? palette.srvStroke : palette.srvOffStroke;
        refs.block.topPath.setAttribute('stroke', nextBlockStroke);
        refs.block.wallPath.setAttribute('stroke', nextBlockStroke);

        const nextTitleColor = srv.healthy ? palette.srvTitle : palette.srvOffTitle;
        const nextSubColor = srv.healthy ? (palette.srvSubtitle || palette.srvTitle) : (palette.srvOffSubtitle || palette.srvOffTitle);
        refs.block.t1?.setAttribute('fill', nextTitleColor);
        refs.block.t2?.setAttribute('fill', nextTitleColor);
        refs.block.subEl?.setAttribute('fill', nextSubColor);

        const nextRackFill = srv.healthy ? palette.srvRackFill : palette.srvOffRackFill;
        const nextRackStroke = srv.healthy ? palette.srvRackStroke : palette.srvOffRackStroke;
        refs.block.rackBoxes?.forEach((box) => {
          box.setAttribute('fill', nextRackFill);
          box.setAttribute('stroke', nextRackStroke);
        });
        refs.block.rackLines?.forEach((line) => {
          line.setAttribute('stroke', nextRackStroke);
        });

        if (refs.block.led1 && refs.block.led2) {
          const ledCol = srv.healthy ? palette.srvLedIdle : palette.srvLedOffline;
          refs.block.led1.setAttribute('fill', ledCol);
          refs.block.led2.setAttribute('fill', ledCol);
        }

        if (refs.wireRefs) {
          const strokeCol = srv.healthy ? palette.wireActive : palette.wireOffline;
          refs.wireRefs.wirePath.setAttribute('stroke', strokeCol);
          if (srv.healthy) {
            refs.wireRefs.wirePath.removeAttribute('stroke-dasharray');
          } else {
            refs.wireRefs.wirePath.setAttribute('stroke-dasharray', '7 6');
          }
          refs.wireRefs.arrowEnd.setAttribute('fill', strokeCol);
          refs.wireRefs.ringEnd.setAttribute('stroke', strokeCol);
          refs.wireRefs.arrowStart.setAttribute('fill', strokeCol);
          refs.wireRefs.ringStart.setAttribute('stroke', strokeCol);
        }

        spawnIsometricFloorWave(srv.u, srv.v, srv.healthy ? palette.floorWaveOnline : palette.floorWaveOffline);
        const failLabel = srv.status === 'failed' ? 'CRASHED • FAILOVER' : 'FAILOVER • REROUTING';
        const liveSrvTop = getLiveNodeTopCenter(srv.id);
        spawnMacroToast(
          liveSrvTop.x,
          liveSrvTop.y - 42,
          srv.healthy ? `${srv.name.toUpperCase()} ONLINE` : failLabel,
          srv.healthy ? palette.toastOkBg : palette.toastFailBg,
          srv.healthy ? palette.toastOkText : palette.toastFailText
        );
      }

      if (!srv.healthy) {
        srv.cpu = 0;
        srv.connections = 0;
        const deadRouteIdx = serverRouteIndices[srvIdx];
        for (let k = activeSlots.length - 1; k >= 0; k--) {
          const i = activeSlots[k];
          if (pktRoute[i] === deadRouteIdx) {
            deactivateSlot(i);
          }
        }
      } else {
        srv.cpu = 36 + (srvIdx % 3) * 10;
        srv.connections = 12 + (srvIdx % 3) * 3;
      }
      refreshServerPillsUI();
    }

    function setLoadBalancerOnline(online, announce = true) {
      currentLbOnline = Boolean(online);
      if (!lbNodeRef) return;

      lbNodeRef.topPath.setAttribute('fill', currentLbOnline ? 'url(#lb-top-grad)' : 'url(#srv-off-top-grad)');
      lbNodeRef.wallPath.setAttribute('fill', currentLbOnline ? 'url(#lb-wall-grad)' : 'url(#srv-off-wall-grad)');

      const nextStroke = currentLbOnline ? palette.lbStroke : palette.srvOffStroke;
      lbNodeRef.topPath.setAttribute('stroke', nextStroke);
      lbNodeRef.wallPath.setAttribute('stroke', nextStroke);

      const nextTitle = currentLbOnline ? palette.lbTitle : palette.srvOffTitle;
      lbNodeRef.t1?.setAttribute('fill', nextTitle);
      lbNodeRef.t2?.setAttribute('fill', nextTitle);

      if (lbNodeRef.globeEls) {
        const iconCol = currentLbOnline ? palette.lbIcon : '#6e665c';
        lbNodeRef.globeEls.forEach((el) => el.setAttribute('stroke', iconCol));
      }

      if (!currentLbOnline) {
        lbNodeRef.haloRing?.setAttribute('opacity', '0');
      }

      if (lbNodeRef.subEl) {
        lbNodeRef.subEl.textContent = currentLbOnline ? (STATE.loadBalancer.subtitle || ALGORITHMS[currentAlgoIdx]) : 'LB OFFLINE';
        lbNodeRef.subEl.setAttribute('fill', currentLbOnline ? palette.lbSubtitle : palette.pillOfflineText);
      }

      if (lbNodeRef.lbLights) {
        const lights = lbNodeRef.lbLights;
        const ventFill = currentLbOnline ? '#8c5a08' : '#302026';
        const ventLip = currentLbOnline ? 'rgba(255, 244, 204, 0.28)' : 'rgba(255, 200, 200, 0.14)';
        lights.leftVentSlots?.forEach(({ slot, lip }) => {
          slot.setAttribute('fill', ventFill);
          lip.setAttribute('stroke', ventLip);
        });
        lights.rightVentSlots?.forEach(({ slot, lip }) => {
          slot.setAttribute('fill', ventFill);
          lip.setAttribute('stroke', ventLip);
        });
        lights.livePillBg.setAttribute('fill', currentLbOnline ? '#4ade80' : '#fb7185');
        lights.livePillText.textContent = currentLbOnline ? 'LIVE' : 'DOWN';
        lights.portLeds.forEach((p) => {
          p.el.setAttribute('fill', currentLbOnline ? p.baseColor : '#57242c');
          p.el.setAttribute('opacity', currentLbOnline ? '0.9' : '0.45');
        });
        lights.hbLed1.setAttribute('fill', currentLbOnline ? '#4ade80' : '#fb7185');
        lights.hbLed2.setAttribute('fill', currentLbOnline ? '#38bdf8' : '#fb7185');
      }

      if (announce) {
        spawnIsometricFloorWave(
          STATE.loadBalancer.u,
          STATE.loadBalancer.v,
          currentLbOnline ? palette.floorWaveOnline : palette.floorWaveOffline
        );
        const liveLbTop = getLiveNodeTopCenter('lb');
        spawnMacroToast(
          liveLbTop.x,
          liveLbTop.y - 44,
          currentLbOnline ? 'LOAD BALANCER ONLINE' : 'LOAD BALANCER OFFLINE',
          currentLbOnline ? palette.toastOkBg : palette.toastFailBg,
          currentLbOnline ? palette.toastOkText : palette.toastFailText
        );
      }
    }

    function applyAlgorithmName(algoName) {
      const normalized = String(algoName).toUpperCase();
      const matchIdx = ALGORITHMS.indexOf(normalized);
      if (matchIdx !== -1) currentAlgoIdx = matchIdx;

      const algo = ALGORITHMS[currentAlgoIdx];
      STATE.loadBalancer.subtitle = algo;

      if (lbNodeRef && lbNodeRef.subEl && currentLbOnline) {
        lbNodeRef.subEl.textContent = algo;
        const liveLbTop = getLiveNodeTopCenter('lb');
        spawnMacroToast(
          liveLbTop.x,
          liveLbTop.y - 44,
          `MODE: ${algo}`,
          palette.toastModeBg,
          palette.toastModeText
        );
      }

      const pretty = algo.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
      if (btnAlgoLabelRef.current) {
        btnAlgoLabelRef.current.textContent = pretty;
      }
    }

    function cycleAlgorithm() {
      const storeAlgos = ['ROUND_ROBIN', 'LEAST_CONNECTIONS', 'IP_HASH'];
      currentAlgoIdx = (currentAlgoIdx + 1) % ALGORITHMS.length;
      applyAlgorithmName(ALGORITHMS[currentAlgoIdx]);
      if (IS_LIVE_BACKEND) {
        useSimulationStore.getState().setAlgorithm(storeAlgos[currentAlgoIdx] || 'ROUND_ROBIN');
      }
    }

    function applyRequestRate(rps) {
      targetRPS = Math.max(1, Math.min(10000, Number(rps) || 12));
      if (metricRpsRef.current) {
        metricRpsRef.current.textContent = `${targetRPS} req/s`;
      }
      rpsBtnRefs.current.forEach((b) => {
        if (!b) return;
        b.classList.toggle('active', parseInt(b.getAttribute('data-rps'), 10) === targetRPS);
      });
    }

    function togglePause() {
      isPaused = !isPaused;
      if (btnPauseRef.current) {
        btnPauseRef.current.classList.toggle('neo-btn--active', isPaused);
      }
      if (btnPauseLabelRef.current) {
        btnPauseLabelRef.current.textContent = isPaused ? 'Resume' : 'Pause';
      }
    }

    function triggerBurstWaveMacro() {
      if (isPaused) togglePause();
      spawnIsometricFloorWave(STATE.loadBalancer.u, STATE.loadBalancer.v, palette.floorWaveBurst);
      for (let i = 0; i < STATE.clients.length; i++) {
        spawnPacket(clientRouteIndices[i], STATE.clients[i].dashed ? 2 : 0, 1, 1.12, i, true);
      }
      if (lbNodeRef) {
        const liveLbTop = getLiveNodeTopCenter('lb');
        spawnMacroToast(
          liveLbTop.x,
          liveLbTop.y - 46,
          '⚡ BURST WAVE',
          palette.toastModeBg,
          palette.toastModeText
        );
      }
    }

    function buildCompleteSVGScene() {
      computePlanarManifoldLayout();
      svgEl.innerHTML = '';
      clientNodeRefs.clear();
      serverNodeRefs.clear();
      svgPacketNodes.length = 0;
      svgPacketMeta.length = 0;
      STATE.servers.forEach((s) => {
        s._lastPillKey = '';
      });
      svgRippleNodes.length = 0;
      activeRipples.length = 0;
      svgToastNodes.length = 0;
      activeToasts.length = 0;
      svgFloorWaveNodes.length = 0;
      activeFloorWaves.length = 0;

      const defs = createSVG('defs');
      defs.innerHTML = `
        <linearGradient id="lb-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.lbTop0}"/>
          <stop offset="100%" stop-color="${palette.lbTop1}"/>
        </linearGradient>
        <linearGradient id="lb-wall-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${palette.lbWall0}"/>
          <stop offset="48%" stop-color="${palette.lbWall48}"/>
          <stop offset="54%" stop-color="${palette.lbWall54}"/>
          <stop offset="100%" stop-color="${palette.lbWall100}"/>
        </linearGradient>

        <linearGradient id="srv-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.srvTop0}"/>
          <stop offset="100%" stop-color="${palette.srvTop1}"/>
        </linearGradient>
        <linearGradient id="srv-wall-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${palette.srvWall0}"/>
          <stop offset="48%" stop-color="${palette.srvWall48}"/>
          <stop offset="54%" stop-color="${palette.srvWall54}"/>
          <stop offset="100%" stop-color="${palette.srvWall100}"/>
        </linearGradient>

        <linearGradient id="srv-off-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.srvOffTop0}"/>
          <stop offset="100%" stop-color="${palette.srvOffTop1}"/>
        </linearGradient>
        <linearGradient id="srv-off-wall-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${palette.srvOffWall0}"/>
          <stop offset="50%" stop-color="${palette.srvOffWall50}"/>
          <stop offset="100%" stop-color="${palette.srvOffWall100}"/>
        </linearGradient>

        <linearGradient id="pad-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.padTop0}"/>
          <stop offset="100%" stop-color="${palette.padTop1}"/>
        </linearGradient>
        <linearGradient id="pad-wall-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${palette.padWall0}"/>
          <stop offset="50%" stop-color="${palette.padWall50}"/>
          <stop offset="100%" stop-color="${palette.padWall100}"/>
        </linearGradient>

        <linearGradient id="laptop-lid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.lapLid0}"/>
          <stop offset="25%" stop-color="${palette.lapLid25}"/>
          <stop offset="100%" stop-color="${palette.lapLid100}"/>
        </linearGradient>
      `;
      svgEl.appendChild(defs);

      const gridG = createSVG('g', { id: 'layer-grid' });
      const shadowsG = createSVG('g', { id: 'layer-shadows' });
      const wiresG = createSVG('g', { id: 'layer-wires' });
      const ripplesG = createSVG('g', { id: 'layer-ripples' });
      const packetsG = createSVG('g', { id: 'layer-packets' });
      const blocksG = createSVG('g', { id: 'layer-blocks' });
      const pillsG = createSVG('g', { id: 'layer-pills' });

      svgEl.appendChild(gridG);
      svgEl.appendChild(shadowsG);
      svgEl.appendChild(wiresG);
      svgEl.appendChild(ripplesG);
      svgEl.appendChild(packetsG);
      svgEl.appendChild(blocksG);
      svgEl.appendChild(pillsG);

      const gridRange = 28;
      for (let i = -gridRange; i <= gridRange; i++) {
        const pA = iso(i, -gridRange);
        const pB = iso(i, gridRange);
        gridG.appendChild(
          createSVG('line', {
            x1: pA.x.toFixed(1),
            y1: pA.y.toFixed(1),
            x2: pB.x.toFixed(1),
            y2: pB.y.toFixed(1),
            stroke: palette.gridLine,
            'stroke-width': '1.25',
          })
        );

        const pC = iso(-gridRange, i);
        const pD = iso(gridRange, i);
        gridG.appendChild(
          createSVG('line', {
            x1: pC.x.toFixed(1),
            y1: pC.y.toFixed(1),
            x2: pD.x.toFixed(1),
            y2: pD.y.toFixed(1),
            stroke: palette.gridLine,
            'stroke-width': '1.25',
          })
        );
      }

      for (let i = 0; i < 6; i++) {
        const el = createSVG('path', {
          d: '',
          fill: 'none',
          stroke: palette.floorWaveBurst,
          'stroke-width': '2.6',
          display: 'none',
        });
        gridG.appendChild(el);
        svgFloorWaveNodes.push({ el, inUse: false, u: 0, v: 0, age: 0, duration: 0.95 });
      }

      ROUTE_TABLES.length = 0;
      clientRouteIndices.length = 0;
      serverRouteIndices.length = 0;
      nodeDragHandlers.clear();
      wiresGroupEl = wiresG;
      blocksGroupEl = blocksG;
      pillsGroupEl = pillsG;

      const lb = STATE.loadBalancer;
      const nClients = STATE.clients.length;
      const nServers = STATE.servers.length;
      const cMid = (nClients - 1) / 2;
      const sMid = (nServers - 1) / 2;

      const clampVal = (val, minV, maxV) => Math.max(minV, Math.min(maxV, val));

      const computeSmartConnectionPts = (
        fromU,
        fromV,
        fromHalf,
        toU,
        toV,
        toHalf,
        fromPortSpread = 0,
        toPortSpread = 0,
        elbowRatio = 0.5
      ) => {
        const du = toU - fromU;
        const dv = toV - fromV;
        const gap = 0.14;

        if (Math.abs(dv) >= Math.abs(du) * 0.68) {
          const signV = dv >= 0 ? 1 : -1;
          const startU = fromU + clampVal(fromPortSpread, -fromHalf * 0.62, fromHalf * 0.62);
          const startV = fromV + signV * (fromHalf + gap);
          const endU = toU + clampVal(toPortSpread, -toHalf * 0.62, toHalf * 0.62);
          const endV = toV - signV * (toHalf + gap);
          const turnV = startV + (endV - startV) * clampVal(elbowRatio, 0.22, 0.78);
          if (Math.abs(startU - endU) < 0.04) {
            return [iso(startU, startV), iso(endU, endV)];
          }
          return [iso(startU, startV), iso(startU, turnV), iso(endU, turnV), iso(endU, endV)];
        } else {
          const signU = du >= 0 ? 1 : -1;
          const startU = fromU + signU * (fromHalf + gap);
          const startV = fromV + clampVal(fromPortSpread, -fromHalf * 0.62, fromHalf * 0.62);
          const endU = toU - signU * (toHalf + gap);
          const endV = toV + clampVal(toPortSpread, -toHalf * 0.62, toHalf * 0.62);
          const turnU = startU + (endU - startU) * clampVal(elbowRatio, 0.22, 0.78);
          if (Math.abs(startV - endV) < 0.04) {
            return [iso(startU, startV), iso(endU, endV)];
          }
          return [iso(startU, startV), iso(turnU, startV), iso(turnU, endV), iso(endU, endV)];
        }
      };

      const updateDockElement = (dock, tipPt, fromPt) => {
        const angle = Math.atan2(tipPt.y - fromPt.y, tipPt.x - fromPt.x) * (180 / Math.PI);
        dock.portRing.setAttribute('cx', tipPt.x.toFixed(2));
        dock.portRing.setAttribute('cy', tipPt.y.toFixed(2));
        dock.arrow.setAttribute(
          'transform',
          `translate(${tipPt.x.toFixed(2)}, ${tipPt.y.toFixed(2)}) rotate(${angle.toFixed(2)})`
        );
      };

      const maxClientDist = Math.max(1, cMid);
      STATE.clients.forEach((client, idx) => {
        const distFromCenter = Math.abs(idx - cMid);
        const portU = (idx - cMid) * 0.46;
        const elbowRatio = 0.28 + (distFromCenter / maxClientDist) * 0.36;
        const pts2D = computeSmartConnectionPts(client.u, client.v, 1.14, lb.u, lb.v, lb.halfSize, 0, portU, elbowRatio);

        const routeData = buildRounded2DPathAndTable(pts2D, 28);
        const routeIdx = ROUTE_TABLES.length;
        ROUTE_TABLES.push(routeData);
        clientRouteIndices.push(routeIdx);

        const strokeCol = client.dashed ? palette.wireDashed : palette.wireActive;
        const pathEl = createSVG('path', {
          d: routeData.svgPath,
          fill: 'none',
          stroke: strokeCol,
          'stroke-width': '2.45',
          'stroke-linecap': 'round',
        });
        if (client.dashed) {
          pathEl.setAttribute('stroke-dasharray', '7 6');
        }
        wiresG.appendChild(pathEl);

        const endDock = createArrowheadAndDockSVG(
          pts2D[pts2D.length - 1],
          pts2D[pts2D.length - 2],
          strokeCol,
          palette.portRingFill
        );
        const startDock = createArrowheadAndDockSVG(pts2D[0], pts2D[1], strokeCol, palette.portRingFill);
        wiresG.appendChild(endDock.group);
        wiresG.appendChild(startDock.group);

        client._wireRefs = {
          routeIdx,
          portU,
          elbowRatio,
          wirePath: pathEl,
          endDock,
          startDock,
          arrowEnd: endDock.arrow,
          ringEnd: endDock.portRing,
          arrowStart: startDock.arrow,
          ringStart: startDock.portRing,
        };
      });

      const maxServerDist = Math.max(1, sMid);
      STATE.servers.forEach((srv, idx) => {
        const distFromCenter = Math.abs(idx - sMid);
        const portU = (idx - sMid) * 0.5;
        const elbowRatio = 0.68 - (distFromCenter / maxServerDist) * 0.34;
        const pts2D = computeSmartConnectionPts(lb.u, lb.v, lb.halfSize, srv.u, srv.v, srv.halfSize, portU, 0, elbowRatio);

        const routeData = buildRounded2DPathAndTable(pts2D, 28);
        const routeIdx = ROUTE_TABLES.length;
        ROUTE_TABLES.push(routeData);
        serverRouteIndices.push(routeIdx);

        const strokeCol = srv.healthy ? palette.wireActive : palette.wireOffline;
        const wirePath = createSVG('path', {
          d: routeData.svgPath,
          fill: 'none',
          stroke: strokeCol,
          'stroke-width': '2.45',
          'stroke-linecap': 'round',
        });
        if (!srv.healthy) {
          wirePath.setAttribute('stroke-dasharray', '7 6');
        }
        wiresG.appendChild(wirePath);

        const endDock = createArrowheadAndDockSVG(
          pts2D[pts2D.length - 1],
          pts2D[pts2D.length - 2],
          strokeCol,
          palette.portRingFill
        );
        const startDock = createArrowheadAndDockSVG(pts2D[0], pts2D[1], strokeCol, palette.portRingFill);
        wiresG.appendChild(endDock.group);
        wiresG.appendChild(startDock.group);

        srv._wireRefs = {
          routeIdx,
          portU,
          elbowRatio,
          wirePath,
          endDock,
          startDock,
          arrowEnd: endDock.arrow,
          ringEnd: endDock.portRing,
          arrowStart: startDock.arrow,
          ringStart: startDock.portRing,
        };
      });

      const refreshClientWire = (client) => {
        const w = client._wireRefs;
        if (!w) return;
        const pts2D = computeSmartConnectionPts(
          client.u,
          client.v,
          1.14,
          lb.u,
          lb.v,
          lb.halfSize,
          0,
          w.portU,
          w.elbowRatio
        );
        const nextRoute = buildRounded2DPathAndTable(pts2D, 28);
        Object.assign(ROUTE_TABLES[w.routeIdx], nextRoute);
        w.wirePath.setAttribute('d', nextRoute.svgPath);
        updateDockElement(w.endDock, pts2D[pts2D.length - 1], pts2D[pts2D.length - 2]);
        updateDockElement(w.startDock, pts2D[0], pts2D[1]);
      };

      const refreshServerWire = (srv) => {
        const w = srv._wireRefs;
        if (!w) return;
        const pts2D = computeSmartConnectionPts(
          lb.u,
          lb.v,
          lb.halfSize,
          srv.u,
          srv.v,
          srv.halfSize,
          w.portU,
          0,
          w.elbowRatio
        );
        const nextRoute = buildRounded2DPathAndTable(pts2D, 28);
        Object.assign(ROUTE_TABLES[w.routeIdx], nextRoute);
        w.wirePath.setAttribute('d', nextRoute.svgPath);
        updateDockElement(w.endDock, pts2D[pts2D.length - 1], pts2D[pts2D.length - 2]);
        updateDockElement(w.startDock, pts2D[0], pts2D[1]);
      };

      const refreshAllWires = () => {
        STATE.clients.forEach(refreshClientWire);
        STATE.servers.forEach(refreshServerWire);
      };

      for (let i = 0; i < SVG_RIPPLE_POOL_SIZE; i++) {
        const el = createSVG('ellipse', {
          cx: '0',
          cy: '0',
          rx: '5',
          ry: '3',
          fill: 'none',
          stroke: palette.rippleReq,
          'stroke-width': '2.2',
          display: 'none',
        });
        ripplesG.appendChild(el);
        svgRippleNodes.push({ el, inUse: false, x: 0, y: 0, color: palette.rippleReq, age: 0, duration: 0.42, maxR: 20 });
      }

      for (let i = 0; i < SVG_PACKET_POOL_SIZE; i++) {
        const el = createSVG('circle', {
          cx: '0',
          cy: '0',
          r: '6.0',
          fill: palette.pktReqFill,
          stroke: palette.pktReqStroke,
          'stroke-width': '2.1',
          display: 'none',
        });
        packetsG.appendChild(el);
        svgPacketNodes.push(el);
        svgPacketMeta.push({ disp: false, type: -1, r: '6.0' });
      }

      const sortAllNodesByDepth = () => {
        if (!blocksGroupEl || !shadowsG) return;
        const entries = [];
        STATE.clients.forEach((c) => {
          const ref = clientNodeRefs.get(c.id);
          if (ref) entries.push({ depth: c.u + c.v, group: ref.laptop.group, shadow: ref.laptop.shadowPath });
        });
        if (lbNodeRef) {
          entries.push({ depth: lb.u + lb.v, group: lbNodeRef.group, shadow: lbNodeRef.shadowPath });
        }
        STATE.servers.forEach((s) => {
          const ref = serverNodeRefs.get(s.id);
          if (ref) entries.push({ depth: s.u + s.v, group: ref.block.group, shadow: ref.block.shadowPath });
        });
        entries.sort((a, b) => a.depth - b.depth);
        entries.forEach((item) => {
          shadowsG.appendChild(item.shadow);
          blocksGroupEl.appendChild(item.group);
        });
      };

      const makeNodeInteractive = ({ nodeObj, groupEl, shadowEl, pillEl, onMove, onClick }) => {
        nodeObj._buildU = nodeObj.u;
        nodeObj._buildV = nodeObj.v;

        const applyDragTransform = () => {
          const du = nodeObj.u - nodeObj._buildU;
          const dv = nodeObj.v - nodeObj._buildV;
          const tx = (du - dv) * TILE_W;
          const ty = (du + dv) * TILE_H;
          const tr = Math.abs(tx) < 0.05 && Math.abs(ty) < 0.05 ? '' : `translate(${tx.toFixed(2)}, ${ty.toFixed(2)})`;
          if (tr) {
            groupEl.setAttribute('transform', tr);
            shadowEl.setAttribute('transform', tr);
            pillEl?.setAttribute('transform', `${pillEl._baseTransform || ''} ${tr}`.trim());
          } else {
            groupEl.removeAttribute('transform');
            shadowEl.removeAttribute('transform');
            if (pillEl?._baseTransform) {
              pillEl.setAttribute('transform', pillEl._baseTransform);
            }
          }
        };

        nodeDragHandlers.set(nodeObj.id, { applyDragTransform, onMove });

        groupEl.addEventListener('pointerenter', () => {
          if (!draggingNodeInfo) hoveredNodeId = nodeObj.id;
        });
        groupEl.addEventListener('pointerleave', () => {
          if (hoveredNodeId === nodeObj.id) hoveredNodeId = null;
        });

        groupEl.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          resetTargets.delete(nodeObj.id);
          const rect = stageContainer.getBoundingClientRect();
          const { vx, vy, vw, vh } = getCurrentViewBoxBounds();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const worldX = vx + (mx / viewportW) * vw;
          const worldY = vy + (my / viewportH) * vh;
          const pointerIso = invIso(worldX, worldY);

          draggingNodeInfo = {
            id: nodeObj.id,
            nodeObj,
            startClientX: e.clientX,
            startClientY: e.clientY,
            offsetU: nodeObj.u - pointerIso.u,
            offsetV: nodeObj.v - pointerIso.v,
            moved: false,
            applyDragTransform,
            onMove,
            onClick,
          };
          hoveredNodeId = nodeObj.id;
          stageContainer.style.cursor = 'grabbing';
        });
      };

      const clientsSorted = STATE.clients.map((c, idx) => ({ client: c, idx, depth: c.u + c.v }));
      clientsSorted.sort((a, b) => a.depth - b.depth);

      clientsSorted.forEach(({ client, idx }) => {
        const scale = nClients >= 6 ? 0.78 : nClients === 5 ? 0.82 : 0.88;
        const laptopObj = createIsometricLaptopNodeSVG({
          u: client.u,
          v: client.v,
          scale,
          palette,
        });
        shadowsG.appendChild(laptopObj.shadowPath);
        blocksG.appendChild(laptopObj.group);

        const pillPos = iso(client.u - 0.15, client.v - 1.85, 16);
        const clientPill = createClientLabelPillSVG({
          cx: pillPos.x,
          cy: pillPos.y,
          text: client.label,
          palette,
        });
        clientPill.group._baseTransform = clientPill.group.getAttribute('transform') || '';
        clientPill.group.addEventListener('click', () => {
          spawnPacket(clientRouteIndices[idx], client.dashed ? 2 : 0, 1, 1.0, idx);
        });
        pillsG.appendChild(clientPill.group);

        makeNodeInteractive({
          nodeObj: client,
          groupEl: laptopObj.group,
          shadowEl: laptopObj.shadowPath,
          pillEl: clientPill.group,
          onMove: () => refreshClientWire(client),
          onClick: () => spawnPacket(clientRouteIndices[idx], client.dashed ? 2 : 0, 1, 1.0, idx),
        });

        clientNodeRefs.set(client.id, { laptop: laptopObj, pill: clientPill });
      });

      lbNodeRef = createIsoDiamondBlockSVG({
        id: 'node-lb',
        u: lb.u,
        v: lb.v,
        halfSize: lb.halfSize,
        cornerR: lb.cornerR,
        height: lb.height,
        topGradId: 'lb-top-grad',
        wallGradId: 'lb-wall-grad',
        iconType: 'globe',
        title1: lb.title1,
        title2: lb.title2,
        subtitle: lb.subtitle,
        palette,
      });
      shadowsG.appendChild(lbNodeRef.shadowPath);
      blocksG.appendChild(lbNodeRef.group);
      makeNodeInteractive({
        nodeObj: lb,
        groupEl: lbNodeRef.group,
        shadowEl: lbNodeRef.shadowPath,
        pillEl: null,
        onMove: refreshAllWires,
        onClick: () => {
          if (IS_LIVE_BACKEND) {
            useSimulationStore.getState().toggleSimulation();
          } else {
            togglePause();
          }
        },
      });
      lbSwitchingArcEl = null;

      const serversSorted = STATE.servers.map((s, idx) => ({ srv: s, idx, depth: s.u + s.v }));
      serversSorted.sort((a, b) => a.depth - b.depth);

      serversSorted.forEach(({ srv, idx }) => {
        srv._lastPillKey = '';
        const srvBlock = createIsoDiamondBlockSVG({
          id: `node-${srv.id}`,
          u: srv.u,
          v: srv.v,
          halfSize: srv.halfSize,
          cornerR: srv.cornerR,
          height: srv.height,
          topGradId: srv.healthy ? 'srv-top-grad' : 'srv-off-top-grad',
          wallGradId: srv.healthy ? 'srv-wall-grad' : 'srv-off-wall-grad',
          iconType: 'server',
          title1: srv.name,
          title2: '',
          subtitle: srv.publicIp || srv.ip || '',
          isOffline: !srv.healthy,
          palette,
        });
        shadowsG.appendChild(srvBlock.shadowPath);
        blocksG.appendChild(srvBlock.group);

        makeNodeInteractive({
          nodeObj: srv,
          groupEl: srvBlock.group,
          shadowEl: srvBlock.shadowPath,
          pillEl: null,
          onMove: () => refreshServerWire(srv),
          onClick: () => {
            if (useSimulationStore.getState().clusterMode !== 'live') {
              toggleServerHealth(idx);
            }
          },
        });

        serverNodeRefs.set(srv.id, {
          srv,
          block: srvBlock,
          pill: srvBlock.meter,
          wireRefs: srv._wireRefs,
        });
      });

      sortAllNodesByDepth();

      // Store depth sorter for live dragging
      svgEl._sortNodesByDepth = sortAllNodesByDepth;

      for (let i = 0; i < SVG_TOAST_POOL_SIZE; i++) {
        const g = createSVG('g', { display: 'none' });
        const rect = createSVG('rect', {
          x: '-38',
          y: '-11',
          width: '76',
          height: '22',
          rx: '11',
          fill: palette.toastOkBg,
          stroke: palette.toastStroke,
          'stroke-width': '1.8',
        });
        const label = createSVG('text', {
          x: '0',
          y: '3.6',
          'text-anchor': 'middle',
          fill: palette.toastOkText,
          'font-family': "'JetBrains Mono', monospace",
          'font-size': '10px',
          'font-weight': '800',
        });
        g.appendChild(rect);
        g.appendChild(label);
        pillsG.appendChild(g);
        svgToastNodes.push({ g, rect, label, inUse: false, x: 0, y: 0, age: 0, duration: 0.85 });
      }

      refreshServerPillsUI();
      setLoadBalancerOnline(currentLbOnline, false);
      syncResetLayoutBtn();

      // Setup first-load-only sequential drop-in + wire-draw entrance animation
      // 1) LB drops first  2) Clients & Servers drop  3) Lines draw smoothly from Client/Server -> LB
      if (introState.active) {
        introState.items = [];
        introState.wireReveals = [];
        pillsG.setAttribute('opacity', '0');

        if (lbNodeRef) {
          lbNodeRef.bounceG.setAttribute('transform', 'translate(0, -175)');
          lbNodeRef.bounceG.setAttribute('opacity', '0');
          lbNodeRef.shadowPath.setAttribute('opacity', '0');
          introState.items.push({
            id: 'lb',
            bounceG: lbNodeRef.bounceG,
            shadowPath: lbNodeRef.shadowPath,
            u: lb.u,
            v: lb.v,
            delay: 0.02,
            duration: 0.44,
            dropDist: 175,
            landed: false,
          });
        }
        STATE.clients.forEach((c, idx) => {
          const ref = clientNodeRefs.get(c.id);
          if (!ref) return;
          ref.laptop.bounceG.setAttribute('transform', 'translate(0, -150)');
          ref.laptop.bounceG.setAttribute('opacity', '0');
          ref.laptop.shadowPath.setAttribute('opacity', '0');
          introState.items.push({
            id: c.id,
            bounceG: ref.laptop.bounceG,
            shadowPath: ref.laptop.shadowPath,
            u: c.u,
            v: c.v,
            delay: 0.36 + idx * 0.055,
            duration: 0.45,
            dropDist: 150,
            landed: false,
          });

          if (c._wireRefs) {
            const w = c._wireRefs;
            const rLen = (ROUTE_TABLES[w.routeIdx]?.totalLen || 400) + 12;
            const maskId = `wire-reveal-c-${idx}`;
            const maskEl = createSVG('mask', { id: maskId, maskUnits: 'userSpaceOnUse' });
            const maskPath = createSVG('path', {
              d: ROUTE_TABLES[w.routeIdx].svgPath,
              fill: 'none',
              stroke: 'white',
              'stroke-width': '18',
              'stroke-linecap': 'round',
              'stroke-dasharray': `${rLen.toFixed(1)} ${rLen.toFixed(1)}`,
              'stroke-dashoffset': rLen.toFixed(1),
            });
            maskEl.appendChild(maskPath);
            defs.appendChild(maskEl);
            w.wirePath.setAttribute('mask', `url(#${maskId})`);
            w.startDock.group.setAttribute('opacity', '0');
            w.endDock.group.setAttribute('opacity', '0');
            introState.wireReveals.push({
              wirePath: w.wirePath,
              maskEl,
              maskPath,
              len: rLen,
              dirSign: 1, // positive dashoffset draws start (Client) -> end (LB)
              delay: 0.78 + idx * 0.05,
              duration: 0.46,
              originDock: w.startDock.group,
              lbDock: w.endDock.group,
            });
          }
        });
        STATE.servers.forEach((s, idx) => {
          const ref = serverNodeRefs.get(s.id);
          if (!ref) return;
          ref.block.bounceG.setAttribute('transform', 'translate(0, -155)');
          ref.block.bounceG.setAttribute('opacity', '0');
          ref.block.shadowPath.setAttribute('opacity', '0');
          introState.items.push({
            id: s.id,
            bounceG: ref.block.bounceG,
            shadowPath: ref.block.shadowPath,
            u: s.u,
            v: s.v,
            delay: 0.40 + idx * 0.065,
            duration: 0.46,
            dropDist: 155,
            landed: false,
          });

          if (s._wireRefs) {
            const w = s._wireRefs;
            const rLen = (ROUTE_TABLES[w.routeIdx]?.totalLen || 400) + 12;
            const maskId = `wire-reveal-s-${idx}`;
            const maskEl = createSVG('mask', { id: maskId, maskUnits: 'userSpaceOnUse' });
            const maskPath = createSVG('path', {
              d: ROUTE_TABLES[w.routeIdx].svgPath,
              fill: 'none',
              stroke: 'white',
              'stroke-width': '18',
              'stroke-linecap': 'round',
              'stroke-dasharray': `${rLen.toFixed(1)} ${rLen.toFixed(1)}`,
              'stroke-dashoffset': (-rLen).toFixed(1),
            });
            maskEl.appendChild(maskPath);
            defs.appendChild(maskEl);
            w.wirePath.setAttribute('mask', `url(#${maskId})`);
            w.endDock.group.setAttribute('opacity', '0');
            w.startDock.group.setAttribute('opacity', '0');
            introState.wireReveals.push({
              wirePath: w.wirePath,
              maskEl,
              maskPath,
              len: rLen,
              dirSign: -1, // negative dashoffset draws end (Server) -> start (LB)
              delay: 0.82 + idx * 0.055,
              duration: 0.46,
              originDock: w.endDock.group,
              lbDock: w.startDock.group,
            });
          }
        });
      }
    }

    engineApiRef.current = {
      applyTheme: (nextMode) => {
        const normalized = nextMode === 'dark' ? 'dark' : 'light';
        if (normalized === currentThemeMode) return;
        currentThemeMode = normalized;
        palette = THEMES[currentThemeMode];
        introState.active = false;
        hasPlayedInitialDrop = true;
        // Rebuild vector scene with new theme palette without clearing live packets or camera state
        buildCompleteSVGScene();
        applyViewBox();
      },
    };

    function addClientDevice(customConfig = {}) {
      if (IS_LIVE_BACKEND || STATE.clients.length >= 6) return null;
      const nextIdx = STATE.clients.length;
      const preset = CLIENT_PRESETS[nextIdx % CLIENT_PRESETS.length];
      const newClient = {
        id: customConfig.id || `client-${Date.now()}-${nextIdx + 1}`,
        label: customConfig.label || preset.label,
        dashed: typeof customConfig.dashed === 'boolean' ? customConfig.dashed : preset.dashed,
        u: 0,
        v: 0,
      };
      STATE.clients.push(newClient);
      clearAllPackets();
      buildCompleteSVGScene();
      return newClient;
    }

    function removeClientDevice(targetId = null) {
      if (IS_LIVE_BACKEND || STATE.clients.length <= 1) return false;
      if (targetId) {
        const idx = STATE.clients.findIndex((c) => c.id === targetId);
        if (idx !== -1) STATE.clients.splice(idx, 1);
      } else {
        STATE.clients.pop();
      }
      clearAllPackets();
      buildCompleteSVGScene();
      return true;
    }

    function addBackendServer(customConfig = {}) {
      if (IS_LIVE_BACKEND || STATE.servers.length >= 5) return null;
      const nextIdx = STATE.servers.length;
      const letter = SERVER_LETTERS[nextIdx] || `${nextIdx + 1}`;
      const newServer = {
        id: customConfig.id || `srv-${letter.toLowerCase()}`,
        name: customConfig.name || `Server ${letter}`,
        cpu: customConfig.cpu ?? 34 + ((nextIdx * 9) % 32),
        connections: customConfig.connections ?? 10 + nextIdx * 2,
        healthy: customConfig.healthy !== undefined ? customConfig.healthy : true,
        halfSize: 1.38,
        cornerR: 0.42,
        height: 58,
        u: 0,
        v: 0,
      };
      STATE.servers.push(newServer);
      clearAllPackets();
      buildCompleteSVGScene();
      return newServer;
    }

    function removeBackendServer(targetId = null) {
      if (IS_LIVE_BACKEND || STATE.servers.length <= 1) return false;
      if (targetId) {
        const idx = STATE.servers.findIndex((s) => s.id === targetId);
        if (idx !== -1) STATE.servers.splice(idx, 1);
      } else {
        STATE.servers.pop();
      }
      clearAllPackets();
      buildCompleteSVGScene();
      return true;
    }

    // Bind control events
    const onAddClient = () => addClientDevice();
    const onRemoveClient = () => removeClientDevice();
    const onAddServer = () => addBackendServer();
    const onRemoveServer = () => removeBackendServer();
    const onZoomIn = () => {
      targetCamera.zoom = Math.min(camera.maxZoom, targetCamera.zoom * 1.25);
      applyViewBox();
    };
    const onZoomOut = () => {
      targetCamera.zoom = Math.max(camera.minZoom, targetCamera.zoom / 1.25);
      if (targetCamera.zoom <= 1.001) {
        targetCamera.zoom = 1.0;
        targetCamera.cx = 820;
        targetCamera.cy = 485;
      }
      applyViewBox();
    };

    const addClientEl = btnAddClientRef.current;
    const removeClientEl = btnRemoveClientRef.current;
    const addServerEl = btnAddServerRef.current;
    const removeServerEl = btnRemoveServerRef.current;
    const algoEl = btnAlgoRef.current;
    const burstEl = btnBurstRef.current;
    const pauseEl = btnPauseRef.current;
    const zoomInEl = btnZoomInRef.current;
    const zoomOutEl = btnZoomOutRef.current;
    const zoomReadoutEl = zoomReadoutRef.current;
    const fitEl = btnFitRef.current;
    const resetLayoutEl = btnResetLayoutRef.current;

    addClientEl?.addEventListener('click', onAddClient);
    removeClientEl?.addEventListener('click', onRemoveClient);
    addServerEl?.addEventListener('click', onAddServer);
    removeServerEl?.addEventListener('click', onRemoveServer);
    algoEl?.addEventListener('click', cycleAlgorithm);
    burstEl?.addEventListener('click', triggerBurstWaveMacro);
    pauseEl?.addEventListener('click', togglePause);
    zoomInEl?.addEventListener('click', onZoomIn);
    zoomOutEl?.addEventListener('click', onZoomOut);
    zoomReadoutEl?.addEventListener('click', resetCameraFit);
    fitEl?.addEventListener('click', resetCameraFit);
    resetLayoutEl?.addEventListener('click', resetNodesSmoothly);

    const rpsHandlers = [];
    rpsBtnRefs.current.forEach((btn) => {
      if (!btn) return;
      const handler = () => applyRequestRate(parseInt(btn.getAttribute('data-rps'), 10));
      btn.addEventListener('click', handler);
      rpsHandlers.push({ btn, handler });
    });

    let zoomCooldownUntil = 0;

    const onWheel = (e) => {
      const now = performance.now();
      const isZoomedIn = targetCamera.zoom > 1.001;
      const isZoomInIntent = e.deltaY < 0 || e.ctrlKey;

      // Keep Lenis page scroll active ONLY when resting at 100% fit and deliberately scrolling down
      if (!isZoomInIntent && !isZoomedIn && now >= zoomCooldownUntil) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (!isZoomedIn && e.deltaY > 0 && !e.ctrlKey) {
        return;
      }

      const effScaleBefore = baseScale * targetCamera.zoom;
      const vwBefore = viewportW / effScaleBefore;
      const vhBefore = viewportH / effScaleBefore;
      const vxBefore = targetCamera.cx - vwBefore / 2;
      const vyBefore = targetCamera.cy - vhBefore / 2;

      const rect = stageContainer.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = vxBefore + (mx / viewportW) * vwBefore;
      const worldY = vyBefore + (my / viewportH) * vhBefore;

      const zoomFactor = Math.exp(-e.deltaY * 0.0014);
      targetCamera.zoom = Math.min(camera.maxZoom, Math.max(camera.minZoom, targetCamera.zoom * zoomFactor));

      if (targetCamera.zoom <= 1.001) {
        targetCamera.zoom = 1.0;
        targetCamera.cx = 820;
        targetCamera.cy = 485;
        zoomCooldownUntil = now + 260;
      } else {
        const effScaleAfter = baseScale * targetCamera.zoom;
        const vwAfter = viewportW / effScaleAfter;
        const vhAfter = viewportH / effScaleAfter;
        const vxAfter = worldX - (mx / viewportW) * vwAfter;
        const vyAfter = worldY - (my / viewportH) * vhAfter;
        targetCamera.cx = vxAfter + vwAfter / 2;
        targetCamera.cy = vyAfter + vhAfter / 2;
      }

      applyViewBox();
    };

    stageContainer.addEventListener('wheel', onWheel, { passive: false });

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartCX = 0;
    let dragStartCY = 0;

    const onPointerDown = (e) => {
      if (e.button !== 0 || draggingNodeInfo || targetCamera.zoom <= 1.01) return;
      isDragging = true;
      stageContainer.style.cursor = 'grabbing';
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartCX = targetCamera.cx;
      dragStartCY = targetCamera.cy;
    };

    const getNodeCollisionRadius = (nodeId) => {
      if (nodeId === 'lb') return 1.54;
      if (nodeId.startsWith('srv-')) return 1.40;
      return 1.20;
    };

    const resolveNonOverlappingIsoPosition = (activeId, desiredU, desiredV, fallbackU, fallbackV) => {
      let candU = Math.max(-10, Math.min(10, desiredU));
      let candV = Math.max(-9.5, Math.min(9.5, desiredV));
      const myR = getNodeCollisionRadius(activeId);

      const obstacles = [];
      if (STATE.loadBalancer.id !== activeId) {
        obstacles.push({ u: STATE.loadBalancer.u, v: STATE.loadBalancer.v, r: getNodeCollisionRadius(STATE.loadBalancer.id) });
      }
      STATE.clients.forEach((c) => {
        if (c.id !== activeId) obstacles.push({ u: c.u, v: c.v, r: getNodeCollisionRadius(c.id) });
      });
      STATE.servers.forEach((s) => {
        if (s.id !== activeId) obstacles.push({ u: s.u, v: s.v, r: getNodeCollisionRadius(s.id) });
      });

      // Push dragged box smoothly outside any colliding boxes so nodes never overlap
      for (let pass = 0; pass < 4; pass++) {
        let adjusted = false;
        for (let i = 0; i < obstacles.length; i++) {
          const ob = obstacles[i];
          const minSep = myR + ob.r;
          const du = candU - ob.u;
          const dv = candV - ob.v;
          const absU = Math.abs(du);
          const absV = Math.abs(dv);
          if (absU < minSep && absV < minSep) {
            const penU = minSep - absU;
            const penV = minSep - absV;
            if (penU < penV) {
              candU = ob.u + (du >= 0 ? minSep : -minSep);
            } else {
              candV = ob.v + (dv >= 0 ? minSep : -minSep);
            }
            candU = Math.max(-10, Math.min(10, candU));
            candV = Math.max(-9.5, Math.min(9.5, candV));
            adjusted = true;
          }
        }
        if (!adjusted) break;
      }

      // If cornered between multiple boxes, reject invalid step cleanly
      const stillColliding = obstacles.some((ob) => {
        const minSep = myR + ob.r - 0.02;
        return Math.abs(candU - ob.u) < minSep && Math.abs(candV - ob.v) < minSep;
      });
      if (stillColliding) {
        return { u: fallbackU, v: fallbackV };
      }
      return { u: candU, v: candV };
    };

    const onPointerMove = (e) => {
      if (draggingNodeInfo) {
        const distPx = Math.hypot(e.clientX - draggingNodeInfo.startClientX, e.clientY - draggingNodeInfo.startClientY);
        if (!draggingNodeInfo.moved && distPx > 5) {
          draggingNodeInfo.moved = true;
        }
        if (draggingNodeInfo.moved) {
          const rect = stageContainer.getBoundingClientRect();
          const { vx, vy, vw, vh } = getCurrentViewBoxBounds();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const worldX = vx + (mx / viewportW) * vw;
          const worldY = vy + (my / viewportH) * vh;
          const ptrIso = invIso(worldX, worldY);
          const resolved = resolveNonOverlappingIsoPosition(
            draggingNodeInfo.id,
            ptrIso.u + draggingNodeInfo.offsetU,
            ptrIso.v + draggingNodeInfo.offsetV,
            draggingNodeInfo.nodeObj.u,
            draggingNodeInfo.nodeObj.v
          );
          const nextU = resolved.u;
          const nextV = resolved.v;
          draggingNodeInfo.nodeObj.u = nextU;
          draggingNodeInfo.nodeObj.v = nextV;
          persistedNodeCoords.set(draggingNodeInfo.id, { u: nextU, v: nextV });
          syncResetLayoutBtn();
          draggingNodeInfo.applyDragTransform();
          draggingNodeInfo.onMove?.();
          svgEl._sortNodesByDepth?.();
        }
        return;
      }

      if (!isDragging) return;
      const effScale = baseScale * targetCamera.zoom;
      const dx = (e.clientX - dragStartX) / effScale;
      const dy = (e.clientY - dragStartY) / effScale;
      targetCamera.cx = dragStartCX - dx;
      targetCamera.cy = dragStartCY - dy;
    };

    const onPointerUp = (e) => {
      if (draggingNodeInfo) {
        const info = draggingNodeInfo;
        draggingNodeInfo = null;
        stageContainer.style.cursor = targetCamera.zoom > 1.01 ? 'grab' : 'default';
        if (!info.moved) {
          info.onClick?.(e);
        } else {
          // Gentle cushion settle bounce on drop
          let b = nodeBounces.get(info.id);
          if (!b) {
            b = { offset: 0, vel: 0, flash: 0, lastTrigger: 0, lastToast: 0 };
            nodeBounces.set(info.id, b);
          }
          b.vel = 48;
          b.flash = 0.65;
        }
        return;
      }
      isDragging = false;
      stageContainer.style.cursor = targetCamera.zoom > 1.01 ? 'grab' : 'default';
    };

    stageContainer.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('resize', syncViewportSize);

    // Expose programmatic API on window
    window.LoadBalancerVisualizer = { ...(window.LoadBalancerVisualizer || {}),
      addClient: (config) => addClientDevice(config),
      removeClient: (id) => removeClientDevice(id),
      addServer: (config) => addBackendServer(config),
      removeServer: (id) => removeBackendServer(id),
      toggleServer: (idOrIndex, forceState) => {
        const idx =
          typeof idOrIndex === 'number'
            ? idOrIndex
            : STATE.servers.findIndex((s) => s.id === idOrIndex || s.name === idOrIndex);
        if (idx !== -1) toggleServerHealth(idx, forceState);
      },
      setAlgorithm: (name) => applyAlgorithmName(name),
      setRequestRate: (rps) => applyRequestRate(rps),
      triggerBurstWave: () => triggerBurstWaveMacro(),
      triggerRequest: (clientIndex = 0) => {
        const cIdx = Math.max(0, Math.min(STATE.clients.length - 1, clientIndex));
        spawnPacket(clientRouteIndices[cIdx], STATE.clients[cIdx].dashed ? 2 : 0, 1, 1.0, cIdx, true);
      },
      setTheme: (mode) => themeCallbacksRef.current.setTheme(mode),
      toggleTheme: () => themeCallbacksRef.current.toggleTheme(),
      getState: () => JSON.parse(JSON.stringify(STATE)),
    };

    buildCompleteSVGScene();
    syncViewportSize();
    if (useSimulationStore.getState().clusterMode === 'dummy') {
      for (let i = 0; i < STATE.clients.length; i++) {
        spawnPacket(clientRouteIndices[i], STATE.clients[i].dashed ? 2 : 0, 1, 1.0, i, true);
      }
    }

    let lastTime = performance.now();
    let spawnAccumulator = 0;
    let metricTimer = 0;
    let gearAngle = 0;
    let clientCursor = 0;
    let rafId = 0;

    const pendingLiveServerPicks = new Map();
    const pendingDirectPicks = new Map();

    function renderLoop(now) {
      rafId = requestAnimationFrame(renderLoop);
      const rawDt = (now - lastTime) * 0.001;
      if (rawDt <= 0) return;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      // Damped silky camera pan & zoom interpolation
      const camDiff =
        Math.abs(targetCamera.zoom - camera.zoom) +
        Math.abs(targetCamera.cx - camera.cx) * 0.01 +
        Math.abs(targetCamera.cy - camera.cy) * 0.01;
      if (camDiff > 0.0005) {
        const camLerp = 1 - Math.exp(-15 * dt);
        camera.zoom += (targetCamera.zoom - camera.zoom) * camLerp;
        camera.cx += (targetCamera.cx - camera.cx) * camLerp;
        camera.cy += (targetCamera.cy - camera.cy) * camLerp;
        if (Math.abs(targetCamera.zoom - camera.zoom) < 0.0005) camera.zoom = targetCamera.zoom;
        if (Math.abs(targetCamera.cx - camera.cx) < 0.05) camera.cx = targetCamera.cx;
        if (Math.abs(targetCamera.cy - camera.cy) < 0.05) camera.cy = targetCamera.cy;
        applyViewBox();
      }

      // Smooth reset-to-default node positions animation
      if (resetTargets.size > 0) {
        const lerpAmt = 1 - Math.exp(-13 * dt);
        let movedAny = false;
        resetTargets.forEach((entry, id) => {
          const { node, targetU, targetV } = entry;
          node.u += (targetU - node.u) * lerpAmt;
          node.v += (targetV - node.v) * lerpAmt;
          if (Math.hypot(targetU - node.u, targetV - node.v) < 0.008) {
            node.u = targetU;
            node.v = targetV;
            resetTargets.delete(id);
          }
          const h = nodeDragHandlers.get(id);
          h?.applyDragTransform();
          h?.onMove?.();
          movedAny = true;
        });
        if (movedAny) {
          svgEl._sortNodesByDepth?.();
          if (resetTargets.size === 0) {
            syncResetLayoutBtn();
          }
        }
      }

      // First-load-only sequential entrance:
      // 1) LB drops down first  2) Clients & Servers drop  3) Lines draw Client/Server -> LB
      if (introState.active) {
        introState.elapsed += dt;
        if (introState.elapsed > 0.20) {
          hasPlayedInitialDrop = true;
        }
        const eT = introState.elapsed;
        introState.items.forEach((item) => {
          const dur = item.duration || 0.45;
          const localP = Math.max(0, Math.min(1, (eT - item.delay) / dur));
          const easeCubic = 1 - Math.pow(1 - localP, 3.2);
          const settleBounce = Math.sin(localP * Math.PI) * (1 - localP) * 0.045;
          const progress = Math.min(1.03, easeCubic + settleBounce);
          const yOff = -item.dropDist * (1 - progress);
          item.bounceG.setAttribute('transform', `translate(0, ${yOff.toFixed(1)})`);
          item.bounceG.setAttribute('opacity', Math.min(1, localP * 3.0).toFixed(2));
          item.shadowPath.setAttribute('opacity', Math.pow(localP, 1.5).toFixed(2));
          if (!item.landed && localP >= 0.96) {
            item.landed = true;
            if (item.id === 'lb') {
              spawnIsometricFloorWave(item.u, item.v, palette.floorWaveBurst);
            }
          }
        });

        // Draw wires smoothly from Clients/Servers toward Load Balancer
        introState.wireReveals.forEach((wr) => {
          const wP = Math.max(0, Math.min(1, (eT - wr.delay) / wr.duration));
          const wEase = 1 - Math.pow(1 - wP, 2.4);
          const offsetVal = wr.dirSign * wr.len * (1 - wEase);
          wr.maskPath.setAttribute('stroke-dashoffset', offsetVal.toFixed(1));
          const originOp = Math.max(0, Math.min(1, wP * 5));
          const lbOp = Math.max(0, Math.min(1, (wP - 0.80) / 0.20));
          wr.originDock.setAttribute('opacity', originOp.toFixed(2));
          wr.lbDock.setAttribute('opacity', lbOp.toFixed(2));
        });

        if (pillsGroupEl) {
          const pP = Math.max(0, Math.min(1, (eT - 0.72) / 0.44));
          const pEase = 1 - Math.pow(1 - pP, 3);
          pillsGroupEl.setAttribute('opacity', pEase.toFixed(2));
          pillsGroupEl.setAttribute('transform', `translate(0, ${(8 * (1 - pEase)).toFixed(1)})`);
        }

        if (eT >= introState.duration) {
          introState.active = false;
          introState.items.forEach((item) => {
            item.bounceG.setAttribute('transform', 'translate(0, 0)');
            item.bounceG.removeAttribute('opacity');
            item.shadowPath.removeAttribute('opacity');
          });
          introState.wireReveals.forEach((wr) => {
            wr.wirePath.removeAttribute('mask');
            wr.originDock.removeAttribute('opacity');
            wr.lbDock.removeAttribute('opacity');
            wr.maskEl.remove();
          });
          introState.wireReveals = [];
          pillsGroupEl?.removeAttribute('opacity');
          pillsGroupEl?.removeAttribute('transform');
        }
      }

      const nClients = STATE.clients.length;

      updateMacroAndSpringAnimations(dt, now);

      const currentMode = useSimulationStore.getState().clusterMode;
      const speedMult = targetRPS >= 1000 ? 1.45 : targetRPS >= 180 ? 1.22 : 1.0;

      if (!isPaused && currentMode === 'dummy' && currentLbOnline) {
        const visualEmitRate =
          targetRPS <= 12
            ? 3.2
            : targetRPS <= 45
            ? 7.5
            : targetRPS <= 180
            ? 14
            : targetRPS <= 1000
            ? 22
            : 30;

        spawnAccumulator += dt * visualEmitRate;
        let attempts = 0;
        while (spawnAccumulator >= 1.0 && attempts < nClients * 2) {
          spawnAccumulator -= 1.0;
          attempts++;
          const cIdx = clientCursor % nClients;
          clientCursor++;
          const client = STATE.clients[cIdx];
          const pType = client && client.dashed ? 2 : 0;
          spawnPacket(clientRouteIndices[cIdx], pType, 1, speedMult, cIdx, false);
        }
        if (spawnAccumulator > 3) spawnAccumulator = 0;
      } else {
        spawnAccumulator = 0;
      }

      // Always drain queued request animations (live SSE/HTTP events + manual 1-Req/Burst in Dummy mode)
      for (let c = 0; c < nClients; c++) {
        clientCooldowns[c] = Math.max(0, clientCooldowns[c] - dt);
      }
      const minGapSec = livePacketQueue.length > 14 ? 0.065 : livePacketQueue.length > 5 ? 0.095 : 0.12;
      let spawnedThisFrame = 0;
      while (livePacketQueue.length > 0 && spawnedThisFrame < nClients) {
        let pickedClient = -1;
        for (let scan = 0; scan < nClients; scan++) {
          const cand = (clientCursor + scan) % nClients;
          const rC = clientRouteIndices[cand];
          if (clientCooldowns[cand] <= 0 && rC !== undefined && canSpawnOnRoute(rC, 1)) {
            pickedClient = cand;
            break;
          }
        }
        if (pickedClient === -1) break;
        clientCursor = (pickedClient + 1) % (nClients || 1);
        const item = livePacketQueue.shift();
        const rC = clientRouteIndices[pickedClient];
        const flags = (item.directNoLb ? 1 : 0) | (!item.isSuccess ? 2 : 0);
        const pType = !item.isSuccess ? 3 : 0;
        spawnPacket(rC, pType, 1, 1.18, pickedClient, false, item.sIdx, flags, item.latency || 0);
        clientCooldowns[pickedClient] = minGapSec;
        spawnedThisFrame++;
      }

      if (!isPaused || activeSlots.length > 0) {
        for (let k = activeSlots.length - 1; k >= 0; k--) {
          const i = activeSlots[k];

          const dir = pktDir[i];
          const uNext = pktU[i] + dir * pktSpeed[i] * dt;
          pktU[i] = uNext;

          if (uNext >= 0.975 || uNext <= 0.025) {
            const rIdx = pktRoute[i];
            const originC = pktClientOrigin[i];
            const route = ROUTE_TABLES[rIdx];
            const tSrv = pktTargetSrv[i];
            const flags = pktFlags[i];
            const latMs = pktLatencyMs[i];
            const isDirect = (flags & 1) !== 0;
            const isErr = (flags & 2) !== 0 || pktType[i] === 3;
            deactivateSlot(i);

            if (dir === 1 && rIdx < nClients) {
              if (isDirect && tSrv >= 0 && serverRouteIndices[tSrv] !== undefined) {
                const sRouteIdx = serverRouteIndices[tSrv];
                spawnPacket(sRouteIdx, isErr ? 3 : 0, 1, 1.2, originC, true, tSrv, flags, latMs);
              } else if (!currentLbOnline) {
                triggerNodeImpact('lb', route ? route.endPt : null, '#ef4444', '502 LB OFFLINE');
                spawnPacket(clientRouteIndices[originC] ?? rIdx, 3, -1, 1.15, originC, true, tSrv, flags | 2, latMs);
              } else {
                triggerNodeImpact('lb', route ? route.endPt : null, isErr ? '#ef4444' : palette.rippleReq);
                let targetSrv = -1;
                if (tSrv >= 0 && tSrv < STATE.servers.length && (STATE.servers[tSrv]?.healthy || isErr)) {
                  targetSrv = tSrv;
                } else {
                  targetSrv = pickHealthyServerIdx(originC);
                }
                if (targetSrv !== -1) {
                  const sRouteIdx = serverRouteIndices[targetSrv];
                  const sRoute = ROUTE_TABLES[sRouteIdx];
                  if (route && sRoute) {
                    triggerLBSwitchingArc(route.endPt, sRoute.startPt);
                  }
                  const algoNow = ALGORITHMS[currentAlgoIdx];
                  const lcSpeed = currentMode === 'dummy' && algoNow === 'LEAST CONN'
                    ? [1.08, 0.72, 1.28][targetSrv % 3]
                    : 1.18;
                  spawnPacket(sRouteIdx, isErr ? 3 : 0, 1, lcSpeed, originC, true, targetSrv, flags, latMs);
                } else {
                  spawnPacket(clientRouteIndices[originC] ?? rIdx, 3, -1, 1.15, originC, true, -1, flags | 2, latMs);
                }
              }
            } else if (dir === 1 && rIdx >= nClients) {
              const srvIdx = rIdx - nClients;
              const srv = STATE.servers[srvIdx];
              if (srv && srv.healthy && !isErr) {
                if (currentMode === 'dummy') {
                  srv.totalRequests = (srv.totalRequests || 0) + 1;
                }
                const msVal = Math.round(latMs || srv.avgLatency || 0);
                const prefix = isDirect ? 'DIRECT 200' : '200 OK';
                const latText = msVal > 0 ? `${prefix} · ${msVal}ms` : prefix;
                triggerNodeImpact(srv.id, route ? route.endPt : null, palette.rippleReq, latText);
                const algoNow = ALGORITHMS[currentAlgoIdx];
                const retSpeed = currentMode === 'dummy' && algoNow === 'LEAST CONN'
                  ? [1.08, 0.72, 1.28][srvIdx % 3]
                  : 1.18;
                // Smooth green return response packet Server -> LB
                spawnPacket(rIdx, 1, -1, retSpeed, originC, true, srvIdx, flags, latMs);
              } else if (srv) {
                triggerNodeImpact(srv.id, route ? route.endPt : null, '#ef4444', '503 CRASHED');
                spawnPacket(rIdx, 3, -1, 1.18, originC, true, srvIdx, flags | 2, latMs);
              }
            } else if (dir === -1 && rIdx >= nClients) {
              if (!isDirect) {
                triggerNodeImpact('lb', route ? route.startPt : null, isErr ? '#ef4444' : palette.rippleRes);
              }
              const validClientIdx = originC < nClients ? originC : 0;
              // Return response packet LB -> Client along actual wire
              spawnPacket(
                clientRouteIndices[validClientIdx],
                isErr ? 3 : 1,
                -1,
                1.18,
                validClientIdx,
                true,
                tSrv,
                flags,
                latMs
              );
            } else if (dir === -1 && rIdx < nClients) {
              const client = STATE.clients[rIdx];
              if (client && route) {
                triggerNodeImpact(client.id, route.startPt, isErr ? '#ef4444' : palette.rippleRes);
                playDotOut(isErr);
              }
            }
          }
        }

        metricTimer += dt;
        if (currentMode === 'dummy' && metricTimer >= 0.65) {
          metricTimer = 0;
          const healthyCount = STATE.servers.filter((s) => s.healthy).length || 1;
          const loadShare = Math.round(
            (3 / healthyCount) * (targetRPS >= 1000 ? 22 : targetRPS >= 180 ? 14 : targetRPS >= 45 ? 6 : 0)
          );

          STATE.servers.forEach((srv, idx) => {
            if (!srv.healthy) return;
            const liveConns = getActiveServerInFlight(idx);
            const targetCpu = Math.min(99, Math.max(12, 16 + liveConns * 9 + loadShare));
            srv.cpu = Math.round((srv.cpu || 20) * 0.55 + targetCpu * 0.45);
            srv.connections = liveConns;
          });
          refreshServerPillsUI();
        }
      }

      if (activeSlots.length > 0 || activeRipples.length > 0) {
        gearAngle = (gearAngle + dt * 52) % 360;
        const rotStr = `rotate(${gearAngle.toFixed(1)})`;
        STATE.servers.forEach((srv) => {
          if (!srv.healthy) return;
          const refs = serverNodeRefs.get(srv.id);
          refs?.pill?.gearPath?.setAttribute('transform', rotStr);
        });
      }

      let renderedCount = 0;
      for (let k = 0; k < activeSlots.length && renderedCount < SVG_PACKET_POOL_SIZE; k++) {
        const i = activeSlots[k];

        const rIdx = pktRoute[i];
        const route = ROUTE_TABLES[rIdx];
        if (!route) continue;

        const u = pktU[i];
        const dir = pktDir[i];
        const sample = sampleRouteWithNormal(route, u);
        const lateralOffset = computeDuplexPassingOffset(i, rIdx, u, dir);

        const px = sample.x + sample.nx * lateralOffset;
        const py = sample.y + sample.ny * lateralOffset;

        let scale = 1.0;
        if (u < 0.11) {
          const t = Math.max(0, (u - 0.025) / 0.085);
          scale = 0.25 + 0.75 * (1 - Math.pow(1 - t, 2));
        } else if (u > 0.89) {
          const t = Math.max(0, (0.975 - u) / 0.085);
          scale = 0.25 + 0.75 * (1 - Math.pow(1 - t, 2));
        }

        const idxPool = renderedCount++;
        const circleEl = svgPacketNodes[idxPool];
        const meta = svgPacketMeta[idxPool];

        circleEl.setAttribute('cx', px.toFixed(1));
        circleEl.setAttribute('cy', py.toFixed(1));

        const rStr = scale === 1.0 ? '6.0' : (6.0 * scale).toFixed(1);
        if (meta.r !== rStr) {
          meta.r = rStr;
          circleEl.setAttribute('r', rStr);
        }

        const pType = pktType[i];
        if (meta.type !== pType) {
          meta.type = pType;
          let fillCol = palette.pktReqFill;
          let strokeCol = palette.pktReqStroke;
          if (pType === 1) {
            fillCol = palette.pktResFill;
            strokeCol = palette.pktResStroke;
          } else if (pType === 3) {
            fillCol = '#ef4444';
            strokeCol = '#7f1d1d';
          } else if (pType !== 0) {
            fillCol = palette.pktHandFill;
            strokeCol = palette.pktHandStroke;
          }
          circleEl.setAttribute('fill', fillCol);
          circleEl.setAttribute('stroke', strokeCol);
        }
        if (!meta.disp) {
          meta.disp = true;
          circleEl.setAttribute('display', 'inline');
        }
      }

      for (let i = renderedCount; i < SVG_PACKET_POOL_SIZE; i++) {
        if (svgPacketMeta[i].disp) {
          svgPacketMeta[i].disp = false;
          svgPacketNodes[i].setAttribute('display', 'none');
        }
      }
    }

    const unsubStore = useSimulationStore.subscribe((st) => {
      if (!IS_LIVE_BACKEND) return;
      const inLiveMode = st.clusterMode === 'live';
      const nextLbOnline = inLiveMode ? Boolean(st.lbOnline) : true;
      isPaused = !st.isRunning;
      targetRPS = st.targetRps;

      syncHudMetrics(st);

      const desiredAlgo = st.algorithm === 'LEAST_CONNECTIONS' ? 'LEAST CONN' : st.algorithm === 'IP_HASH' ? 'IP HASH' : 'ROUND ROBIN';
      if (ALGORITHMS[currentAlgoIdx] !== desiredAlgo) {
        applyAlgorithmName(desiredAlgo);
      }
      if (st.servers && st.servers.length === STATE.servers.length) {
        st.servers.forEach((s, i) => {
          const nextHealthy = s.status === 'healthy';
          const healthChanged = STATE.servers[i].healthy !== nextHealthy;
          STATE.servers[i].storeId = s.id;
          STATE.servers[i].name = s.name;
          STATE.servers[i].publicIp = s.publicIp || s.ip || STATE.servers[i].publicIp;
          STATE.servers[i].cpu = s.cpu ?? 25;
          STATE.servers[i].connections = s.activeConnections ?? 0;
          STATE.servers[i].totalRequests = s.totalRequests ?? 0;
          STATE.servers[i].avgLatency = s.avgLatency ?? 0;
          STATE.servers[i].status = s.status || 'healthy';
          const refs = serverNodeRefs.get(STATE.servers[i].id);
          if (refs?.block) {
            if (refs.block.t1) refs.block.t1.textContent = s.name;
            if (refs.block.subEl) refs.block.subEl.textContent = STATE.servers[i].publicIp || '';
          }
          if (healthChanged) {
            toggleServerHealth(i, nextHealthy);
          } else {
            STATE.servers[i].healthy = nextHealthy;
          }
        });
        refreshServerPillsUI();
      }
      if (nextLbOnline !== currentLbOnline) {
        setLoadBalancerOnline(nextLbOnline, true);
      }
    });
    
    const onLbPacketEvent = (e) => {
      const { serverId, isSuccess, directNoLb, latency, fromTick } = e.detail || {};
      if (fromTick && useSimulationStore.getState().clusterMode === 'dummy') return;
      const nServers = STATE.servers.length;
      if (nServers === 0) return;

      let sIdx = STATE.servers.findIndex((s, idx) =>
        s.id === serverId ||
        s.name === serverId ||
        s.host === serverId ||
        serverId === `server-${idx + 1}` ||
        serverId === `srv-${idx + 1}` ||
        (typeof serverId === 'string' && serverId.toLowerCase().includes(String.fromCharCode(97 + idx))) ||
        (typeof serverId === 'string' && serverId.endsWith(String(idx + 1)))
      );
      if (sIdx === -1) sIdx = rrCounter % nServers;

      // Represent any volume (10 reqs or 10,000 reqs) smoothly without flooding wires with dots
      if (livePacketQueue.length >= 12) {
        livePacketQueue.shift();
      }
      livePacketQueue.push({
        sIdx,
        isSuccess: isSuccess !== false,
        directNoLb: Boolean(directNoLb),
        latency: latency || 0,
      });
    };
    window.addEventListener('lb-packet-event', onLbPacketEvent);

    rafId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(rafId);
      unsubStore();
      window.removeEventListener('lb-packet-event', onLbPacketEvent);
      addClientEl?.removeEventListener('click', onAddClient);
      removeClientEl?.removeEventListener('click', onRemoveClient);
      addServerEl?.removeEventListener('click', onAddServer);
      removeServerEl?.removeEventListener('click', onRemoveServer);
      algoEl?.removeEventListener('click', cycleAlgorithm);
      burstEl?.removeEventListener('click', triggerBurstWaveMacro);
      pauseEl?.removeEventListener('click', togglePause);
      zoomInEl?.removeEventListener('click', onZoomIn);
      zoomOutEl?.removeEventListener('click', onZoomOut);
      zoomReadoutEl?.removeEventListener('click', resetCameraFit);
      fitEl?.removeEventListener('click', resetCameraFit);
      resetLayoutEl?.removeEventListener('click', resetNodesSmoothly);
      rpsHandlers.forEach(({ btn, handler }) => btn.removeEventListener('click', handler));
      stageContainer.removeEventListener('wheel', onWheel);
      stageContainer.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', syncViewportSize);
      engineApiRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineApiRef.current?.applyTheme(activeTheme);
  }, [activeTheme]);

  return (
    <>
      <style>{VISUALIZER_3D_STYLES}</style>

      <div ref={rootRef} className={`lb-iso-visualizer${isDark ? ' lb-theme-dark' : ''}`}>
        <div className="paper-grain" />

        <div className="hud-top-bar">
          <div className="hud-metrics-row">
            <div className="metric-card">
              <div className="metric-card__header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span>TRANSFERRED</span>
              </div>
              <div className="metric-card__value" ref={metricTotalReqsRef} id="metric-dns">0 reqs</div>
            </div>

            <div className="metric-card">
              <div className="metric-card__header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <path d="M8.5 8.5l7 7" />
                </svg>
                <span>LB DISPATCH</span>
              </div>
              <div className="metric-card__value" ref={metricDispatchRef} id="metric-connect">1 ms · 0c</div>
            </div>

            <div className="metric-card">
              <div className="metric-card__header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="4" width="18" height="6" rx="1.5" />
                  <rect x="3" y="14" width="18" height="6" rx="1.5" />
                </svg>
                <span>SERVER EXEC</span>
              </div>
              <div className="metric-card__value" ref={metricServerExecRef} id="metric-server">0 ms</div>
            </div>

            <div className="metric-card">
              <div className="metric-card__header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <span>THROUGHPUT</span>
              </div>
              <div className="metric-card__value" ref={metricRpsRef} id="metric-rps">0 req/s</div>
            </div>

            <div className="metric-card">
              <div className="metric-card__header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2.5 1.5M9 2h6" />
                </svg>
                <span>TOTAL RTT</span>
              </div>
              <div className="metric-card__value metric-card__value--green" ref={metricTotalRttRef} id="metric-total">0 ms</div>
            </div>
          </div>
        </div>

        <div ref={stageContainerRef} className="stage-container">
          <svg ref={svgElRef} className="scene-svg" xmlns="http://www.w3.org/2000/svg" />
        </div>

        <div className="hud-bottom-legend">
          <span className="legend-item">
            <i className="legend-dot legend-dot--req" />
            request
          </span>
          <span className="legend-item">
            <i className="legend-dot legend-dot--res" />
            response
          </span>
          <span className="legend-item">
            <i className="legend-dot legend-dot--hand" />
            handshake
          </span>
        </div>

        <div className="hud-zoom-controls">
          <div className="zoom-pill">
            <button type="button" className="zoom-btn" ref={btnZoomOutRef} title="Zoom Out">
              −
            </button>
            <div className="zoom-readout" ref={zoomReadoutRef} title="Click to Reset 100% Fit">
              100%
            </div>
            <button type="button" className="zoom-btn" ref={btnZoomInRef} title="Zoom In">
              +
            </button>
          </div>
          <button
            type="button"
            className="neo-btn"
            ref={btnFitRef}
            style={{ padding: '5px 11px', fontSize: '11px' }}
          >
            <span className="hud-fit-text-full">Fit View</span>
            <span className="hud-fit-text-short">Fit</span>
          </button>
          <button
            type="button"
            className="neo-btn icon-only-btn"
            ref={btnResetLayoutRef}
            title="Reset boxes to default positions"
            aria-label="Reset boxes to default positions"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
});

export default memo(function Visualizer3D({ theme, onThemeChange, onSelectNode, selectedNode } = {}) {
  return <LoadBalancerVisualizer theme={theme} onThemeChange={onThemeChange} />;
});














