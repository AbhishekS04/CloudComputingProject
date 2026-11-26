import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { playDotIn, playDotOut } from '../../lib/sound';

const IS_LIVE_BACKEND = true;

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
    gridLine: '#e2dac8',
    shadow: 'rgba(156, 142, 118, 0.34)',
    wireActive: '#23211e',
    wireDashed: '#8e8678',
    wireOffline: '#9e9687',
    portRingFill: '#fdfbf7',

    lbTop0: '#fff9e6',
    lbTop1: '#f5dc96',
    lbWall0: '#f3d386',
    lbWall48: '#e5bf69',
    lbWall54: '#d7af56',
    lbWall100: '#e3bd68',
    lbStroke: '#23211e',
    lbCrease: 'rgba(35, 33, 30, 0.10)',
    lbBevel: 'rgba(255, 255, 255, 0.90)',
    lbIcon: '#23211e',
    lbTitle: '#23211e',
    lbSubtitle: '#574c3a',
    lbHalo: '#d99b26',

    srvTop0: '#f2f7ff',
    srvTop1: '#c8defa',
    srvWall0: '#bdd5f6',
    srvWall48: '#a1bee8',
    srvWall54: '#8da9d8',
    srvWall100: '#9fbbe6',
    srvStroke: '#23211e',
    srvCrease: 'rgba(35, 33, 30, 0.10)',
    srvBevel: 'rgba(255, 255, 255, 0.90)',
    srvRackFill: '#ffffff',
    srvRackStroke: '#23211e',
    srvLedIdle: '#23211e',
    srvLedFlash1: '#48b850',
    srvLedFlash2: '#f08c65',
    srvLedOffline: '#d84632',
    srvTitle: '#23211e',
    srvHalo: '#5887d8',

    srvOffTop0: '#f3efe8',
    srvOffTop1: '#dad3c7',
    srvOffWall0: '#d2cbc0',
    srvOffWall50: '#b6aea2',
    srvOffWall100: '#c5beb2',
    srvOffStroke: '#23211e',
    srvOffTitle: '#23211e',
    srvOffRackFill: '#ffffff',
    srvOffRackStroke: '#23211e',

    padTop0: '#f6f1e7',
    padTop1: '#e8e0d2',
    padWall0: '#e1d9c9',
    padWall50: '#c6bcab',
    padWall100: '#d6cebe',
    padStroke: '#23211e',
    padBevel: 'rgba(255, 255, 255, 0.92)',

    lapShadow: 'rgba(145, 132, 112, 0.30)',
    lapBaseRim: '#d5cdc0',
    lapDeck: '#f4efe4',
    lapStroke: '#23211e',
    lapKeyFill: '#ebe5d8',
    lapKeyStroke: '#9a9183',
    lapTrackpadFill: '#ebe5d8',
    lapTrackpadStroke: '#9a9183',
    lapLid0: '#5c5751',
    lapLid25: '#423e39',
    lapLid100: '#2c2926',
    lapBezelFill: '#2b2825',
    lapBezelStroke: '#23211e',
    lapSpecular: 'rgba(255, 255, 255, 0.90)',
    lapViewport: '#fcfaf5',
    lapToolbar: '#eae3d5',
    lapUrl: '#ffffff',
    lapHero: '#cec2f2',
    lapHeroFlash: '#b9a6f2',
    lapSkeleton: '#d5cec0',

    pillClientShadow: 'rgba(35, 33, 30, 0.12)',
    pillServerShadow: 'rgba(35, 33, 30, 0.13)',
    pillHardShadow: '#23211e',
    pillBg: '#fdfbf7',
    pillOfflineBg: '#f5efe6',
    pillBorder: '#23211e',
    pillText: '#23211e',
    pillOfflineText: '#8c3022',
    pillIcon: '#23211e',
    pillGear: '#5c5549',
    pillGearHole: '#fdfbf7',
    pillTrack: '#e5dfd1',
    pillToggleOn: '#78c67a',
    pillToggleOff: '#e08070',
    pillToggleOffRefresh: '#e28171',
    pillToggleStroke: '#23211e',
    pillToggleText: '#23211e',

    pktReqFill: '#f08c65',
    pktReqStroke: '#23211e',
    pktResFill: '#78c67a',
    pktResStroke: '#23211e',
    pktHandFill: '#f6f1e6',
    pktHandStroke: '#4f9d52',

    lbArc: '#f08c65',
    rippleReq: '#f08c65',
    rippleRes: '#78c67a',
    floorWaveBurst: '#e6b84e',
    floorWaveOnline: '#6ec472',
    floorWaveOffline: '#e06c58',

    toastStroke: '#23211e',
    toastOkBg: '#e9f7ea',
    toastOkText: '#1d682d',
    toastFailBg: '#fde7e3',
    toastFailText: '#94291b',
    toastModeBg: '#fff3d1',
    toastModeText: '#23211e',
  },
  dark: {
    gridLine: '#292533',
    shadow: 'rgba(6, 5, 12, 0.62)',
    wireActive: '#e8e1d5',
    wireDashed: '#7d748a',
    wireOffline: '#575063',
    portRingFill: '#1b1822',

    // Vivid Sunburst Golden Amber Load Balancer
    lbTop0: '#ffe494',
    lbTop1: '#f5b942',
    lbWall0: '#eb9f28',
    lbWall48: '#d98816',
    lbWall54: '#c4750c',
    lbWall100: '#d98816',
    lbStroke: '#141218',
    lbCrease: 'rgba(20, 18, 24, 0.18)',
    lbBevel: 'rgba(255, 250, 225, 0.85)',
    lbIcon: '#1f180a',
    lbTitle: '#1f180a',
    lbSubtitle: '#4a350c',
    lbHalo: '#ffd166',

    // Vivid Electric Periwinkle / Sky Blue Backend Servers
    srvTop0: '#a8ccff',
    srvTop1: '#6ca4f8',
    srvWall0: '#588fe8',
    srvWall48: '#4176d1',
    srvWall54: '#3263ba',
    srvWall100: '#4176d1',
    srvStroke: '#141218',
    srvCrease: 'rgba(20, 18, 24, 0.20)',
    srvBevel: 'rgba(235, 246, 255, 0.80)',
    srvRackFill: '#ffffff',
    srvRackStroke: '#141218',
    srvLedIdle: '#141218',
    srvLedFlash1: '#22c55e',
    srvLedFlash2: '#ff7b54',
    srvLedOffline: '#ef4444',
    srvTitle: '#0f1b33',
    srvHalo: '#7cc0ff',

    // Distinct Muted Slate Offline Servers
    srvOffTop0: '#383442',
    srvOffTop1: '#2b2733',
    srvOffWall0: '#25222c',
    srvOffWall50: '#1c1922',
    srvOffWall100: '#211e28',
    srvOffStroke: '#6b6378',
    srvOffTitle: '#9e96ab',
    srvOffRackFill: '#2b2733',
    srvOffRackStroke: '#7d748c',

    // Rich Slate-Plum Client Cushion Pads & Illuminated Laptops
    padTop0: '#484154',
    padTop1: '#363140',
    padWall0: '#2e2938',
    padWall50: '#211d29',
    padWall100: '#282330',
    padStroke: '#9185a6',
    padBevel: 'rgba(235, 226, 255, 0.36)',

    lapShadow: 'rgba(10, 8, 16, 0.50)',
    lapBaseRim: '#322d3d',
    lapDeck: '#524a60',
    lapStroke: '#141218',
    lapKeyFill: '#6b627c',
    lapKeyStroke: '#2b2633',
    lapTrackpadFill: '#5f566e',
    lapTrackpadStroke: '#2b2633',
    lapLid0: '#5e556e',
    lapLid25: '#3b3445',
    lapLid100: '#221e29',
    lapBezelFill: '#18151d',
    lapBezelStroke: '#a194b8',
    lapSpecular: 'rgba(245, 238, 255, 0.68)',
    lapViewport: '#272230',
    lapToolbar: '#383244',
    lapUrl: '#4d445c',
    lapHero: '#a78bfa',
    lapHeroFlash: '#c4b5fd',
    lapSkeleton: '#615773',

    // High-Contrast Colorful Pills
    pillClientShadow: 'rgba(8, 7, 14, 0.45)',
    pillServerShadow: 'rgba(8, 7, 14, 0.48)',
    pillHardShadow: '#09080d',
    pillBg: '#262230',
    pillOfflineBg: '#1e1b24',
    pillBorder: '#a194b8',
    pillText: '#f7f3ff',
    pillOfflineText: '#ff8577',
    pillIcon: '#c4b5fd',
    pillGear: '#c4b5fd',
    pillGearHole: '#262230',
    pillTrack: '#3d374a',
    pillToggleOn: '#4ade80',
    pillToggleOff: '#fb7185',
    pillToggleOffRefresh: '#fb7185',
    pillToggleStroke: '#141218',
    pillToggleText: '#141218',

    // Luminous Packets & Effects
    pktReqFill: '#ff7b54',
    pktReqStroke: '#141218',
    pktResFill: '#4ade80',
    pktResStroke: '#141218',
    pktHandFill: '#1e1b24',
    pktHandStroke: '#38bdf8',

    lbArc: '#ff7b54',
    rippleReq: '#ff7b54',
    rippleRes: '#4ade80',
    floorWaveBurst: '#ffd166',
    floorWaveOnline: '#4ade80',
    floorWaveOffline: '#fb7185',

    toastStroke: '#141218',
    toastOkBg: '#4ade80',
    toastOkText: '#0f2918',
    toastFailBg: '#fb7185',
    toastFailText: '#2b0910',
    toastModeBg: '#ffd166',
    toastModeText: '#261a05',
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

  const iconG = createSVG('g', {
    transform: `translate(${centerTop.x.toFixed(1)}, ${(centerTop.y - 14).toFixed(1)})`,
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

  const t1 = createSVG('text', {
    x: centerTop.x.toFixed(1),
    y: (centerTop.y + 27).toFixed(1),
    'text-anchor': 'middle',
    fill: titleColor,
    'font-family': "'JetBrains Mono', monospace",
    'font-size': subtitle ? '17px' : '18.5px',
    'font-weight': '800',
    'letter-spacing': '-0.02em',
  });
  t1.textContent = title1;
  bounceG.appendChild(t1);

  const t2 = createSVG('text', {
    x: centerTop.x.toFixed(1),
    y: (centerTop.y + 47).toFixed(1),
    'text-anchor': 'middle',
    fill: titleColor,
    'font-family': "'JetBrains Mono', monospace",
    'font-size': subtitle ? '16px' : '18px',
    'font-weight': '700',
  });
  t2.textContent = title2;
  bounceG.appendChild(t2);

  let subEl = null;
  if (subtitle) {
    subEl = createSVG('text', {
      x: centerTop.x.toFixed(1),
      y: (centerTop.y + 67).toFixed(1),
      'text-anchor': 'middle',
      fill: palette.lbSubtitle,
      'font-family': "'JetBrains Mono', monospace",
      'font-size': '11px',
      'font-weight': '800',
      'letter-spacing': '0.04em',
    });
    subEl.textContent = subtitle;
    bounceG.appendChild(subEl);
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

function createServerMetricPillSVG({ cx, cy, srv, palette = THEMES.light }) {
  const width = 232;
  const height = 31;
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
      fill: palette.pillServerShadow,
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

  const bgRect = createSVG('rect', {
    x: -hw,
    y: -hh,
    width,
    height,
    rx,
    fill: palette.pillBg,
    stroke: palette.pillBorder,
    'stroke-width': '2.3',
  });
  g.appendChild(bgRect);

  const gearWrap = createSVG('g', { transform: `translate(${-hw + 16.5}, 0)` });
  const gearPath = createSVG('path', {
    class: 'svg-gear-spin',
    d: 'M -2 -7.2 L 2 -7.2 L 2.6 -5.0 L 4.6 -4.0 L 6.6 -5.0 L 8.2 -2.4 L 6.4 -0.8 L 6.4 0.8 L 8.2 2.4 L 6.6 5.0 L 4.6 4.0 L 2.6 5.0 L 2 7.2 L -2 7.2 L -2.6 5.0 L -4.6 4.0 L -6.6 5.0 L -8.2 2.4 L -6.4 0.8 L -6.4 -0.8 L -8.2 -2.4 L -6.6 -5.0 L -4.6 -4.0 L -2.6 -5.0 Z',
    fill: palette.pillGear,
  });
  gearWrap.appendChild(gearPath);
  gearWrap.appendChild(createSVG('circle', { cx: 0, cy: 0, r: 2.5, fill: palette.pillGearHole }));
  g.appendChild(gearWrap);

  const trackX = -hw + 28;
  const trackW = 34;
  const trackH = 8.2;
  g.appendChild(
    createSVG('rect', {
      x: trackX,
      y: -trackH / 2,
      width: trackW,
      height: trackH,
      rx: 4.1,
      fill: palette.pillTrack,
    })
  );

  const fillW = Math.max(4, (srv.cpu / 100) * trackW);
  const fillRect = createSVG('rect', {
    x: trackX,
    y: -trackH / 2,
    width: fillW,
    height: trackH,
    rx: 4.1,
    fill: '#6ec472',
  });
  g.appendChild(fillRect);

  const metricText = createSVG('text', {
    x: trackX + trackW + 6,
    y: 3.8,
    'text-anchor': 'start',
    fill: palette.pillText,
    'font-family': "'JetBrains Mono', monospace",
    'font-size': '10px',
    'font-weight': '800',
  });
  metricText.textContent = `${srv.cpu}% • ${srv.totalRequests || 0} req`;
  g.appendChild(metricText);

  const toggleW = 35;
  const toggleH = 19.5;
  const toggleX = hw - toggleW - 6;
  const toggleBg = createSVG('rect', {
    x: toggleX,
    y: -toggleH / 2,
    width: toggleW,
    height: toggleH,
    rx: 9.75,
    fill: srv.healthy ? palette.pillToggleOn : palette.pillToggleOff,
    stroke: palette.pillToggleStroke,
    'stroke-width': '1.8',
  });
  g.appendChild(toggleBg);

  const toggleText = createSVG('text', {
    x: toggleX + toggleW / 2,
    y: 3.5,
    'text-anchor': 'middle',
    fill: palette.pillToggleText,
    'font-family': "'JetBrains Mono', monospace",
    'font-size': '9.5px',
    'font-weight': '800',
  });
  toggleText.textContent = srv.healthy ? 'ON' : 'OFF';
  g.appendChild(toggleText);

  return { group: g, bgRect, fillRect, metricText, gearPath, trackW, toggleBg, toggleText };
}

// ============================================================================
// PLAIN REACT 18 COMPONENT
// ============================================================================
export function LoadBalancerVisualizer({ theme, onThemeChange } = {}) {
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
      currentAlgoIdx = useSimulationStore.getState().algorithm === 'LEAST_CONNECTIONS' ? 1 : 0;
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

        if (metricTotalReqsRef.current) {
          metricTotalReqsRef.current.textContent = failedReqs > 0
            ? `${totalReqs.toLocaleString()} (${failedReqs} err)`
            : `${totalReqs.toLocaleString()} reqs`;
        }
        if (metricDispatchRef.current) {
          metricDispatchRef.current.textContent = online ? `${lbDisp} ms · ${activeConns}c` : 'OFFLINE';
        }
        if (metricServerExecRef.current) {
          metricServerExecRef.current.textContent = !online ? 'PAUSED' : (healthyCnt > 0 ? `${srvExec} ms` : 'ERR 503');
        }
        if (metricRpsRef.current) {
          metricRpsRef.current.textContent = `${rpsVal} req/s`;
        }
        if (metricTotalRttRef.current) {
          metricTotalRttRef.current.textContent = !online ? 'LB OFFLINE' : (healthyCnt > 0 ? `${avgRtt} ms` : 'NO NODES');
          metricTotalRttRef.current.classList.toggle('metric-card__value--green', online && healthyCnt > 0);
        }
      };
      syncHudMetrics(useSimulationStore.getState());
    }
    let rrCounter = 0;

    const ROUTE_TABLES = [];
    const clientRouteIndices = [];
    const serverRouteIndices = [];

    const nodeBounces = new Map();
    const clientNodeRefs = new Map();
    const serverNodeRefs = new Map();
    let lbNodeRef = null;
    let lbSwitchingArcEl = null;
    let currentLbOnline = IS_LIVE_BACKEND ? useSimulationStore.getState().lbOnline : true;

    const SVG_PACKET_POOL_SIZE = 280;
    const svgPacketNodes = [];

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
    const pktRoute = new Uint16Array(MAX_PACKETS);
    const pktType = new Uint8Array(MAX_PACKETS); // 0 = coral request, 1 = green response, 2 = handshake, 3 = crimson error
    const pktDir = new Int8Array(MAX_PACKETS); // +1 forward, -1 reverse
    const pktU = new Float32Array(MAX_PACKETS); // 0.0 -> 1.0 normalized arc-length
    const pktSpeed = new Float32Array(MAX_PACKETS);
    const pktClientOrigin = new Uint8Array(MAX_PACKETS);
    const pktTargetSrv = new Int16Array(MAX_PACKETS);
    const pktFlags = new Uint8Array(MAX_PACKETS); // bit 1: directNoLb, bit 2: isErr
    const pktLatencyMs = new Float32Array(MAX_PACKETS);

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

    let viewportW = stageContainer.clientWidth || window.innerWidth;
    let viewportH = stageContainer.clientHeight || window.innerHeight;
    let baseScale = 1.0;

    function applyViewBox() {
      if (camera.zoom <= 1.001) {
        camera.zoom = 1.0;
        camera.cx = 820;
        camera.cy = 485;
      }
      const effScale = baseScale * camera.zoom;
      const vw = viewportW / effScale;
      const vh = viewportH / effScale;
      const vx = camera.cx - vw / 2;
      const vy = camera.cy - vh / 2;

      svgEl.setAttribute('viewBox', `${vx.toFixed(3)} ${vy.toFixed(3)} ${vw.toFixed(3)} ${vh.toFixed(3)}`);
      if (zoomReadoutRef.current) {
        zoomReadoutRef.current.textContent = `${Math.round(camera.zoom * 100)}%`;
      }
      if (btnZoomOutRef.current) {
        btnZoomOutRef.current.disabled = camera.zoom <= 1.001;
      }
      if (btnZoomInRef.current) {
        btnZoomInRef.current.disabled = camera.zoom >= camera.maxZoom - 0.01;
      }
      stageContainer.style.cursor = camera.zoom > 1.01 ? 'grab' : 'default';
    }

    function syncViewportSize() {
      viewportW = stageContainer.clientWidth || window.innerWidth;
      viewportH = stageContainer.clientHeight || window.innerHeight;
      baseScale = Math.min(viewportW / 1540, viewportH / 920);
      applyViewBox();
    }

    function resetCameraFit() {
      camera.cx = 820,
      camera.cy = 485;
      camera.zoom = 1.0;
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

    function triggerLBSwitchingArc(inPortPt, outPortPt) {
      if (!lbSwitchingArcEl || !lbNodeRef) return;
      const c = lbNodeRef.centerTop;
      const p1x = c.x + (inPortPt.x - c.x) * 0.55;
      const p1y = c.y + (inPortPt.y - c.y) * 0.55;
      const p2x = c.x + (outPortPt.x - c.x) * 0.55;
      const p2y = c.y + (outPortPt.y - c.y) * 0.55;

      lbSwitchingArcEl.setAttribute(
        'd',
        `M ${p1x.toFixed(1)} ${p1y.toFixed(1)} Q ${c.x.toFixed(1)} ${(c.y - 12).toFixed(1)} ${p2x.toFixed(1)} ${p2y.toFixed(1)}`
      );
      lbSwitchingArcEl.setAttribute('opacity', '0.92');
      lbSwitchingArcEl._fadeAge = 0.28;
    }

    function triggerNodeImpact(nodeId, portPt, rippleColor = palette.rippleReq, toastText = null) {
      const now = performance.now();
      let b = nodeBounces.get(nodeId);
      if (!b) {
        b = { offset: 0, vel: 0, flash: 0, lastTrigger: 0, lastToast: 0 };
        nodeBounces.set(nodeId, b);
      }
      if (now - b.lastTrigger > 75) {
        b.vel = 62;
        b.flash = 1.0;
        b.lastTrigger = now;
        if (portPt) {
          spawnPortRipple(portPt.x, portPt.y, rippleColor, nodeId === 'lb' ? 20 : 17);
        }
        if (toastText && now - b.lastToast > 550 && serverNodeRefs.has(nodeId)) {
          b.lastToast = now;
          const sRef = serverNodeRefs.get(nodeId);
          spawnMacroToast(
            sRef.block.centerTop.x,
            sRef.block.centerTop.y - 38,
            toastText,
            palette.toastOkBg,
            palette.toastOkText
          );
        }
      }
    }

    function updateMacroAndSpringAnimations(dt) {
      const stiffness = 430;
      const damping = 23;

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
        b.flash = Math.max(0, b.flash - dt * 3.5);

        if (nodeId === 'lb' && lbNodeRef) {
          lbNodeRef.bounceG.setAttribute('transform', `translate(0, ${b.offset.toFixed(2)})`);
          lbNodeRef.haloRing.setAttribute('opacity', (b.flash * 0.65).toFixed(2));
        } else if (serverNodeRefs.has(nodeId)) {
          const sRef = serverNodeRefs.get(nodeId);
          sRef.block.bounceG.setAttribute('transform', `translate(0, ${b.offset.toFixed(2)})`);
          sRef.block.haloRing.setAttribute('opacity', (b.flash * 0.7).toFixed(2));
          if (sRef.block.led1 && sRef.srv.healthy) {
            const ledCol = b.flash > 0.35 ? palette.srvLedFlash1 : palette.srvLedIdle;
            sRef.block.led1.setAttribute('fill', ledCol);
            sRef.block.led2.setAttribute('fill', b.flash > 0.55 ? palette.srvLedFlash2 : palette.srvLedIdle);
          }
        } else if (clientNodeRefs.has(nodeId)) {
          const cRef = clientNodeRefs.get(nodeId);
          cRef.laptop.bounceG.setAttribute('transform', `translate(0, ${(b.offset * 0.55).toFixed(2)})`);
          if (cRef.laptop.heroBannerPath) {
            cRef.laptop.heroBannerPath.setAttribute(
              'fill',
              b.flash > 0.35 ? palette.lapHeroFlash : palette.lapHero
            );
          }
        }
      });

      if (lbSwitchingArcEl && lbSwitchingArcEl._fadeAge > 0) {
        lbSwitchingArcEl._fadeAge = Math.max(0, lbSwitchingArcEl._fadeAge - dt);
        lbSwitchingArcEl.setAttribute('opacity', (lbSwitchingArcEl._fadeAge / 0.28).toFixed(2));
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
      for (let i = 0; i < MAX_PACKETS; i++) {
        if (pktActive[i] === 0) continue;
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

      pktActive[slot] = 1;
      pktRoute[slot] = routeIdx;
      pktType[slot] = type;
      pktDir[slot] = dir;
      pktU[slot] = dir === 1 ? 0.025 : 0.975;
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

      for (let j = 0; j < MAX_PACKETS; j++) {
        if (pktActive[j] === 0 || j === slotIdx) continue;
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
        let best = healthy[0];
        for (let i = 1; i < healthy.length; i++) {
          if (STATE.servers[healthy[i]].connections < STATE.servers[best].connections) {
            best = healthy[i];
          }
        }
        return best;
      } else {
        return healthy[clientIdx % healthy.length];
      }
    }

    function clearAllPackets() {
      pktActive.fill(0);
      livePacketQueue.length = 0;
      for (let i = 0; i < svgPacketNodes.length; i++) {
        svgPacketNodes[i].setAttribute('display', 'none');
      }
    }

    function refreshServerPillsUI() {
      STATE.servers.forEach((srv) => {
        const refs = serverNodeRefs.get(srv.id);
        if (!refs) return;
        const { bgRect, fillRect, metricText, gearPath, trackW, toggleBg, toggleText } = refs.pill;

        if (!srv.healthy) {
          bgRect.setAttribute('fill', palette.pillOfflineBg);
          fillRect.setAttribute('width', '0');
          metricText.textContent = srv.status === 'failed' ? 'CRASHED' : 'OFFLINE';
          metricText.setAttribute('fill', palette.pillOfflineText);
          gearPath.classList.add('svg-gear-paused');
          toggleBg.setAttribute('fill', palette.pillToggleOffRefresh);
          toggleText.textContent = 'OFF';
        } else {
          bgRect.setAttribute('fill', palette.pillBg);
          const w = Math.max(4, (Math.min(100, srv.cpu) / 100) * trackW);
          fillRect.setAttribute('width', w.toFixed(1));
          const barColor = srv.cpu > 78 ? '#e36652' : srv.cpu > 58 ? '#eba444' : '#6ec472';
          fillRect.setAttribute('fill', barColor);
          metricText.textContent = `${srv.cpu}% • ${srv.totalRequests || 0} req`;
          metricText.setAttribute('fill', palette.pillText);
          gearPath.classList.remove('svg-gear-paused');
          toggleBg.setAttribute('fill', palette.pillToggleOn);
          toggleText.textContent = 'ON';
        }
      });
    }

    function computePlanarManifoldLayout() {
      const nC = STATE.clients.length;
      const clientSpacingU = nC <= 3 ? 3.5 : nC === 4 ? 3.15 : nC === 5 ? 2.75 : 2.4;
      const cMid = (nC - 1) / 2;

      STATE.clients.forEach((c, idx) => {
        c.u = (idx - cMid) * clientSpacingU;
        c.v = -5.85;
      });

      const nS = STATE.servers.length;
      const serverSpacingU = nS <= 3 ? 3.7 : nS === 4 ? 3.2 : 2.8;
      const sMid = (nS - 1) / 2;

      STATE.servers.forEach((s, idx) => {
        s.u = (idx - sMid) * serverSpacingU;
        s.v = 5.85;
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
      srv.healthy = typeof forceState === 'boolean' ? forceState : !srv.healthy;
      if (IS_LIVE_BACKEND && typeof forceState !== 'boolean') {
        useSimulationStore.getState().toggleServerStatus(srv.id);
      }

      const refs = serverNodeRefs.get(srv.id);
      if (refs) {
        refs.block.topPath.setAttribute('fill', srv.healthy ? 'url(#srv-top-grad)' : 'url(#srv-off-top-grad)');
        refs.block.wallPath.setAttribute('fill', srv.healthy ? 'url(#srv-wall-grad)' : 'url(#srv-off-wall-grad)');
        const nextBlockStroke = srv.healthy ? palette.srvStroke : palette.srvOffStroke;
        refs.block.topPath.setAttribute('stroke', nextBlockStroke);
        refs.block.wallPath.setAttribute('stroke', nextBlockStroke);

        const nextTitleColor = srv.healthy ? palette.srvTitle : palette.srvOffTitle;
        refs.block.t1?.setAttribute('fill', nextTitleColor);
        refs.block.t2?.setAttribute('fill', nextTitleColor);

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
        spawnMacroToast(
          refs.block.centerTop.x,
          refs.block.centerTop.y - 42,
          srv.healthy ? `${srv.name.toUpperCase()} ONLINE` : failLabel,
          srv.healthy ? palette.toastOkBg : palette.toastFailBg,
          srv.healthy ? palette.toastOkText : palette.toastFailText
        );
      }

      if (!srv.healthy) {
        srv.cpu = 0;
        srv.connections = 0;
        const deadRouteIdx = serverRouteIndices[srvIdx];
        for (let i = 0; i < MAX_PACKETS; i++) {
          if (pktActive[i] && pktRoute[i] === deadRouteIdx) {
            pktActive[i] = 0;
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

      if (announce) {
        spawnIsometricFloorWave(
          STATE.loadBalancer.u,
          STATE.loadBalancer.v,
          currentLbOnline ? palette.floorWaveOnline : palette.floorWaveOffline
        );
        spawnMacroToast(
          lbNodeRef.centerTop.x,
          lbNodeRef.centerTop.y - 44,
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
        spawnMacroToast(
          lbNodeRef.centerTop.x,
          lbNodeRef.centerTop.y - 44,
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
      currentAlgoIdx = (currentAlgoIdx + 1) % ALGORITHMS.length;
      applyAlgorithmName(ALGORITHMS[currentAlgoIdx]);
    }

    function applyRequestRate(rps) {
      targetRPS = Math.max(1, Math.min(10000, Number(rps) || 12));
      if (metricRpsRef.current) {
        metricRpsRef.current.textContent = rpsVal + " req/s";
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
      spawnIsometricFloorWave(0, 0, palette.floorWaveBurst);
      for (let i = 0; i < STATE.clients.length; i++) {
        spawnPacket(clientRouteIndices[i], STATE.clients[i].dashed ? 2 : 0, 1, 1.12, i, true);
      }
      if (lbNodeRef) {
        spawnMacroToast(
          lbNodeRef.centerTop.x,
          lbNodeRef.centerTop.y - 46,
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

      const lb = STATE.loadBalancer;
      const nClients = STATE.clients.length;
      const nServers = STATE.servers.length;
      const cMid = (nClients - 1) / 2;
      const sMid = (nServers - 1) / 2;

      const maxClientDist = Math.max(1, cMid);
      STATE.clients.forEach((client, idx) => {
        const distFromCenter = Math.abs(idx - cMid);
        const portU = (idx - cMid) * 0.46;
        const startU = client.u;
        const startV = client.v + 1.28;
        const endV = lb.v - lb.halfSize - 0.14;
        const turnV = -3.85 + (distFromCenter / maxClientDist) * 1.35;

        const pts2D = [iso(startU, startV), iso(startU, turnV), iso(portU, turnV), iso(portU, endV)];

        const routeData = buildRounded2DPathAndTable(pts2D, 28);
        const routeIdx = ROUTE_TABLES.length;
        ROUTE_TABLES.push(routeData);
        clientRouteIndices.push(routeIdx);

        const strokeCol = client.dashed ? palette.wireDashed : palette.wireActive;
        const pathEl = createSVG('path', {
          d: routeData.svgPath,
          fill: 'none',
          stroke: strokeCol,
          'stroke-width': '2.65',
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
      });

      const maxServerDist = Math.max(1, sMid);
      STATE.servers.forEach((srv, idx) => {
        const distFromCenter = Math.abs(idx - sMid);
        const portU = (idx - sMid) * 0.5;
        const startV = lb.v + lb.halfSize + 0.14;
        const endU = srv.u;
        const endV = srv.v - srv.halfSize - 0.14;
        const turnV = 3.55 - (distFromCenter / maxServerDist) * 1.2;

        const pts2D = [iso(portU, startV), iso(portU, turnV), iso(endU, turnV), iso(endU, endV)];

        const routeData = buildRounded2DPathAndTable(pts2D, 28);
        const routeIdx = ROUTE_TABLES.length;
        ROUTE_TABLES.push(routeData);
        serverRouteIndices.push(routeIdx);

        const strokeCol = srv.healthy ? palette.wireActive : palette.wireOffline;
        const wirePath = createSVG('path', {
          d: routeData.svgPath,
          fill: 'none',
          stroke: strokeCol,
          'stroke-width': '2.65',
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
          wirePath,
          arrowEnd: endDock.arrow,
          ringEnd: endDock.portRing,
          arrowStart: startDock.arrow,
          ringStart: startDock.portRing,
        };
      });

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
          r: '6.4',
          fill: palette.pktReqFill,
          stroke: palette.pktReqStroke,
          'stroke-width': '2.35',
          display: 'none',
        });
        packetsG.appendChild(el);
        svgPacketNodes.push(el);
      }

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
        laptopObj.group.addEventListener('click', () => {
          spawnPacket(clientRouteIndices[idx], client.dashed ? 2 : 0, 1, 1.0, idx);
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
        clientPill.group.addEventListener('click', () => {
          spawnPacket(clientRouteIndices[idx], client.dashed ? 2 : 0, 1, 1.0, idx);
        });
        pillsG.appendChild(clientPill.group);

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
      lbNodeRef.group.style.cursor = 'pointer';
      lbNodeRef.group.addEventListener('click', (e) => {
        e.stopPropagation();
        if (IS_LIVE_BACKEND) {
          useSimulationStore.getState().toggleSimulation();
        } else {
          togglePause();
        }
      });
      lbSwitchingArcEl = createSVG('path', {
        d: '',
        fill: 'none',
        stroke: palette.lbArc,
        'stroke-width': '3.0',
        'stroke-linecap': 'round',
        'stroke-dasharray': '5 4',
        opacity: '0',
      });
      lbSwitchingArcEl._fadeAge = 0;
      lbNodeRef.bounceG.appendChild(lbSwitchingArcEl);

      const serversSorted = STATE.servers.map((s, idx) => ({ srv: s, idx, depth: s.u + s.v }));
      serversSorted.sort((a, b) => a.depth - b.depth);

      serversSorted.forEach(({ srv, idx }) => {
        const nameParts = srv.name.split(' ');
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
          title1: nameParts[0],
          title2: nameParts[1] || '',
          subtitle: srv.publicIp || srv.ip || '',
          isOffline: !srv.healthy,
          palette,
        });
        srvBlock.group.addEventListener('click', () => toggleServerHealth(idx));
        shadowsG.appendChild(srvBlock.shadowPath);
        blocksG.appendChild(srvBlock.group);

        const pillPos = iso(srv.u + 0.15, srv.v + 2.35, 0);
        const metricPill = createServerMetricPillSVG({
          cx: pillPos.x,
          cy: pillPos.y,
          srv,
          palette,
        });
        metricPill.group.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleServerHealth(idx);
        });
        pillsG.appendChild(metricPill.group);

        serverNodeRefs.set(srv.id, {
          srv,
          block: srvBlock,
          pill: metricPill,
          wireRefs: srv._wireRefs,
        });
      });

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
    }

    engineApiRef.current = {
      applyTheme: (nextMode) => {
        const normalized = nextMode === 'dark' ? 'dark' : 'light';
        if (normalized === currentThemeMode) return;
        currentThemeMode = normalized;
        palette = THEMES[currentThemeMode];
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
      camera.zoom = Math.min(camera.maxZoom, camera.zoom * 1.25);
      applyViewBox();
    };
    const onZoomOut = () => {
      camera.zoom = Math.max(camera.minZoom, camera.zoom / 1.25);
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

    const rpsHandlers = [];
    rpsBtnRefs.current.forEach((btn) => {
      if (!btn) return;
      const handler = () => applyRequestRate(parseInt(btn.getAttribute('data-rps'), 10));
      btn.addEventListener('click', handler);
      rpsHandlers.push({ btn, handler });
    });

    const onWheel = (e) => {
      // At 100% default fit, scrolling down lets Lenis scroll the page naturally
      if (e.deltaY > 0 && camera.zoom <= 1.001) {
        return;
      }
      // At 100% scrolling up while Ctrl/pinch isn't pressed? Let user zoom in smoothly ONLY if zoomed or pinching/scrolling inside stage
      e.preventDefault();
      const effScaleBefore = baseScale * camera.zoom;
      const vwBefore = viewportW / effScaleBefore;
      const vhBefore = viewportH / effScaleBefore;
      const vxBefore = camera.cx - vwBefore / 2;
      const vyBefore = camera.cy - vhBefore / 2;

      const rect = stageContainer.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = vxBefore + (mx / viewportW) * vwBefore;
      const worldY = vyBefore + (my / viewportH) * vhBefore;

      const zoomFactor = Math.exp(-e.deltaY * 0.0014);
      camera.zoom = Math.min(camera.maxZoom, Math.max(camera.minZoom, camera.zoom * zoomFactor));

      if (camera.zoom <= 1.001) {
        camera.zoom = 1.0;
        camera.cx = 820;
        camera.cy = 485;
      } else {
        const effScaleAfter = baseScale * camera.zoom;
        const vwAfter = viewportW / effScaleAfter;
        const vhAfter = viewportH / effScaleAfter;
        const vxAfter = worldX - (mx / viewportW) * vwAfter;
        const vyAfter = worldY - (my / viewportH) * vhAfter;
        camera.cx = vxAfter + vwAfter / 2;
        camera.cy = vyAfter + vhAfter / 2;
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
      if (e.button !== 0 || camera.zoom <= 1.01) return;
      isDragging = true;
      stageContainer.style.cursor = 'grabbing';
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartCX = camera.cx;
      dragStartCY = camera.cy;
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const effScale = baseScale * camera.zoom;
      const dx = (e.clientX - dragStartX) / effScale;
      const dy = (e.clientY - dragStartY) / effScale;
      camera.cx = dragStartCX - dx;
      camera.cy = dragStartCY - dy;
      applyViewBox();
    };

    const onPointerUp = () => {
      isDragging = false;
      stageContainer.style.cursor = camera.zoom > 1.01 ? 'grab' : 'default';
    };

    stageContainer.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
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
    let clientCursor = 0;
    let rafId = 0;

    const pendingLiveServerPicks = new Map();
    const pendingDirectPicks = new Map();

    function renderLoop(now) {
      rafId = requestAnimationFrame(renderLoop);
      const dt = Math.min((now - lastTime) * 0.001, 0.05);
      lastTime = now;

      const nClients = STATE.clients.length;

      if (!isPaused) {
        updateMacroAndSpringAnimations(dt);

        const currentMode = useSimulationStore.getState().clusterMode;
        const speedMult = targetRPS >= 1000 ? 1.45 : targetRPS >= 180 ? 1.22 : 1.0;

        if (currentMode === 'dummy' && currentLbOnline) {
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
          // Live Azure Mode: paced queue emission -> silky smooth evenly spaced dots, zero clumping
          spawnAccumulator = 0;
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
        }

        for (let i = 0; i < MAX_PACKETS; i++) {
          if (pktActive[i] === 0) continue;

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
            pktActive[i] = 0;

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
                  spawnPacket(sRouteIdx, isErr ? 3 : 0, 1, 1.18, originC, true, targetSrv, flags, latMs);
                } else {
                  spawnPacket(clientRouteIndices[originC] ?? rIdx, 3, -1, 1.15, originC, true, -1, flags | 2, latMs);
                }
              }
            } else if (dir === 1 && rIdx >= nClients) {
              const srvIdx = rIdx - nClients;
              const srv = STATE.servers[srvIdx];
              if (srv && srv.healthy && !isErr) {
                const msVal = Math.round(latMs || srv.avgLatency || 0);
                const prefix = isDirect ? 'DIRECT 200' : '200 OK';
                const latText = msVal > 0 ? `${prefix} · ${msVal}ms` : prefix;
                triggerNodeImpact(srv.id, route ? route.endPt : null, palette.rippleReq, latText);
                // Smooth green return response packet Server -> LB
                spawnPacket(rIdx, 1, -1, 1.18, originC, true, srvIdx, flags, latMs);
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
        if (currentMode === 'dummy' && metricTimer >= 1.0) {
          metricTimer = 0;
          const healthyCount = STATE.servers.filter((s) => s.healthy).length || 1;
          const loadShare = Math.round(
            (3 / healthyCount) * (targetRPS >= 1000 ? 22 : targetRPS >= 180 ? 14 : targetRPS >= 45 ? 6 : 0)
          );
          const connMult = targetRPS >= 5000 ? 14 : targetRPS >= 1000 ? 7 : targetRPS >= 180 ? 3 : 1;

          STATE.servers.forEach((srv, idx) => {
            if (!srv.healthy) return;
            const baseCpu = 34 + ((idx * 11) % 28);
            const jitter = Math.floor(Math.random() * 7) - 3;
            srv.cpu = Math.min(99, Math.max(12, baseCpu + loadShare + jitter));
            const baseConn = 12 + ((idx * 3) % 10);
            srv.connections = Math.round(baseConn * connMult * (3 / healthyCount) + Math.floor(Math.random() * 4));
          });
          refreshServerPillsUI();
        }
      }

      let renderedCount = 0;
      for (let i = 0; i < MAX_PACKETS && renderedCount < SVG_PACKET_POOL_SIZE; i++) {
        if (pktActive[i] === 0) continue;

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

        const circleEl = svgPacketNodes[renderedCount++];
        circleEl.setAttribute('cx', px.toFixed(2));
        circleEl.setAttribute('cy', py.toFixed(2));
        circleEl.setAttribute('r', (6.4 * scale).toFixed(2));

        const pType = pktType[i];
        if (pType === 0) {
          circleEl.setAttribute('fill', palette.pktReqFill);
          circleEl.setAttribute('stroke', palette.pktReqStroke);
        } else if (pType === 1) {
          circleEl.setAttribute('fill', palette.pktResFill);
          circleEl.setAttribute('stroke', palette.pktResStroke);
        } else if (pType === 3) {
          circleEl.setAttribute('fill', '#ef4444');
          circleEl.setAttribute('stroke', '#7f1d1d');
        } else {
          circleEl.setAttribute('fill', palette.pktHandFill);
          circleEl.setAttribute('stroke', palette.pktHandStroke);
        }
        circleEl.setAttribute('display', 'inline');
      }

      for (let i = renderedCount; i < SVG_PACKET_POOL_SIZE; i++) {
        if (svgPacketNodes[i].getAttribute('display') !== 'none') {
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

      const healthyCnt = (st.servers || []).filter((s) => s.status === 'healthy').length;
      const totalReqs = st.metrics?.totalRequests ?? 0;
      const failedReqs = st.metrics?.failedRequests ?? 0;
      const activeConns = st.metrics?.activeConnectionsTotal ?? 0;
      const liveRps = (st.isRunning && nextLbOnline) ? (st.metrics?.currentRps ?? (inLiveMode ? 0 : st.targetRps)) : 0;
      const avgRtt = Math.round(st.metrics?.avgLatency || 0);
      const srvExec = Math.round(st.metrics?.serverExec ?? (inLiveMode ? 4 : 42));
      const lbDisp = Math.round(st.metrics?.lbDispatch ?? (inLiveMode ? 2 : 24));

      if (metricTotalReqsRef.current) {
        metricTotalReqsRef.current.textContent = failedReqs > 0
          ? `${totalReqs.toLocaleString()} (${failedReqs} err)`
          : `${totalReqs.toLocaleString()} reqs`;
      }
      if (metricDispatchRef.current) {
        metricDispatchRef.current.textContent = nextLbOnline ? `${lbDisp} ms · ${activeConns}c` : 'OFFLINE';
      }
      if (metricServerExecRef.current) {
        metricServerExecRef.current.textContent = !nextLbOnline ? 'PAUSED' : (healthyCnt > 0 ? `${srvExec} ms` : 'ERR 503');
      }
      if (metricRpsRef.current) {
        metricRpsRef.current.textContent = `${liveRps} req/s`;
      }
      if (metricTotalRttRef.current) {
        metricTotalRttRef.current.textContent = !nextLbOnline ? 'LB OFFLINE' : (healthyCnt > 0 ? `${avgRtt} ms` : 'NO NODES');
        metricTotalRttRef.current.classList.toggle('metric-card__value--green', nextLbOnline && healthyCnt > 0);
      }

      const desiredAlgo = st.algorithm === 'LEAST_CONNECTIONS' ? 'LEAST CONN' : st.algorithm === 'IP_HASH' ? 'IP HASH' : 'ROUND ROBIN';
      if (ALGORITHMS[currentAlgoIdx] !== desiredAlgo) {
        applyAlgorithmName(desiredAlgo);
      }
      if (st.servers && st.servers.length === STATE.servers.length) {
        st.servers.forEach((s, i) => {
          const nextHealthy = s.status === 'healthy';
          const healthChanged = STATE.servers[i].healthy !== nextHealthy;
          STATE.servers[i].name = s.name;
          STATE.servers[i].cpu = s.cpu ?? 25;
          STATE.servers[i].connections = s.activeConnections ?? 0;
          STATE.servers[i].totalRequests = s.totalRequests ?? 0;
          STATE.servers[i].avgLatency = s.avgLatency ?? 0;
          STATE.servers[i].status = s.status || 'healthy';
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
      const { serverId, isSuccess, directNoLb, latency } = e.detail || {};
      const nServers = STATE.servers.length;
      if (nServers === 0) return;
      isPaused = false;

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
      rpsHandlers.forEach(({ btn, handler }) => btn.removeEventListener('click', handler));
      stageContainer.removeEventListener('wheel', onWheel);
      stageContainer.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', syncViewportSize);
      engineApiRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineApiRef.current?.applyTheme(activeTheme);
  }, [activeTheme]);

  return (
    <>
      <style>{`
        .lb-iso-visualizer * {
          box-sizing: border-box;
          user-select: none;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .lb-iso-visualizer {
          position: relative;
          width: 100%;
          min-height: 440px;
          height: 470px;
          overflow: hidden;
          background: radial-gradient(circle at 50% 48%, #faf6ed 0%, #f6f1e6 70%, #ebe2d0 100%);
          font-family: 'JetBrains Mono', monospace;
          color: #23211e;
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
          opacity: 0.25;
          background-image: radial-gradient(rgba(115, 100, 78, 0.15) 0.75px, transparent 0.75px);
          background-size: 14px 14px;
        }

        .lb-iso-visualizer .stage-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          cursor: grab;
          touch-action: none;
          z-index: 5;
        }

        .lb-iso-visualizer .stage-container:active {
          cursor: grabbing;
        }

        .lb-iso-visualizer .scene-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          overflow: visible;
          shape-rendering: geometricPrecision;
          text-rendering: geometricPrecision;
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
          background: rgba(253, 251, 247, 0.95);
          border: 1.5px solid #c8c0af;
          border-radius: 10px;
          padding: 6px 13px;
          min-width: 112px;
          box-shadow: 0 2px 5px rgba(35, 33, 30, 0.05);
          backdrop-filter: blur(6px);
        }

        .lb-iso-visualizer .metric-card__header {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 9.5px;
          font-weight: 700;
          color: #7a7367;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 1px;
        }

        .lb-iso-visualizer .metric-card__value {
          font-size: 15.5px;
          font-weight: 800;
          color: #23211e;
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
        }

        .lb-iso-visualizer .metric-card__value--green {
          color: #217238;
        }

        .lb-iso-visualizer .hud-actions-row {
          display: flex;
          align-items: center;
          gap: 7px;
          pointer-events: auto;
          flex-wrap: wrap;
        }

        .lb-iso-visualizer .neo-btn {
          background: #fdfbf7;
          color: #23211e;
          border: 2px solid #23211e;
          border-radius: 10px;
          padding: 6px 11px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          box-shadow: 0 2.5px 0 #23211e, 0 4px 8px rgba(35, 33, 30, 0.08);
          transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.12s ease;
        }

        .lb-iso-visualizer .neo-btn:hover {
          background: #fff7e4;
          transform: translateY(-1px);
          box-shadow: 0 3.5px 0 #23211e, 0 6px 12px rgba(35, 33, 30, 0.12);
        }

        .lb-iso-visualizer .neo-btn:active {
          transform: translateY(1.5px);
          box-shadow: 0 1px 0 #23211e;
        }

        .lb-iso-visualizer .neo-btn--active {
          background: #f3ce75;
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
          border: 2px solid #23211e;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2.5px 0 #23211e;
        }

        .lb-iso-visualizer .stepper-label {
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 800;
          color: #23211e;
          background: #f4eee1;
          border-right: 1.5px solid #23211e;
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
          border-right: 1.5px solid #23211e;
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
          border: 2px solid #23211e;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2.5px 0 #23211e;
        }

        .lb-iso-visualizer .rps-btn {
          padding: 5.5px 9px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          color: #4d473e;
          background: transparent;
          border: none;
          border-right: 1.5px solid #23211e;
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
          gap: 18px;
          font-size: 12px;
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
          width: 11px;
          height: 11px;
          border-radius: 50%;
          border: 2px solid #23211e;
          display: inline-block;
        }

        .lb-iso-visualizer .legend-dot--req {
          background: #f08c65;
        }

        .lb-iso-visualizer .legend-dot--res {
          background: #78c67a;
        }

        .lb-iso-visualizer .legend-dot--hand {
          background: #f6f1e6;
          border-color: #4f9d52;
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
          background: #fdfbf7;
          border: 2px solid #23211e;
          border-radius: 10px;
          box-shadow: 0 2.5px 0 #23211e;
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
          background: #f5ecd7;
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
          }
          .lb-iso-visualizer .metric-card {
            padding: 4px 8px;
            min-width: 82px;
            border-radius: 8px;
          }
          .lb-iso-visualizer .metric-card__header {
            font-size: 8px;
          }
          .lb-iso-visualizer .metric-card__value {
            font-size: 12px;
          }
          .lb-iso-visualizer .hud-bottom-legend {
            left: 10px;
            bottom: 10px;
            gap: 10px;
            font-size: 9.5px;
          }
          .lb-iso-visualizer .hud-zoom-controls {
            right: 10px;
            bottom: 10px;
          }
        }

        .lb-iso-visualizer .zoom-readout {
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 700;
          border-left: 1.5px solid #23211e;
          border-right: 1.5px solid #23211e;
          min-width: 54px;
          text-align: center;
          font-variant-numeric: tabular-nums;
          cursor: pointer;
        }

        .lb-iso-visualizer .iso-interactive-node {
          cursor: pointer;
        }

        @keyframes svg-gear-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .lb-iso-visualizer .svg-gear-spin {
          transform-box: fill-box;
          transform-origin: center;
          animation: svg-gear-spin 7s linear infinite;
        }

        .lb-iso-visualizer .svg-gear-paused {
          animation-play-state: paused;
        }

        /* Dark Mode Colorful Theme Overrides */
        .lb-iso-visualizer.lb-theme-dark {
          background: radial-gradient(circle at 50% 48%, #221f2b 0%, #16141c 68%, #0e0d12 100%);
          color: #f6f2ff;
        }

        .lb-iso-visualizer.lb-theme-dark .paper-grain {
          opacity: 0.42;
          background-image: radial-gradient(rgba(196, 181, 253, 0.11) 0.75px, transparent 0.75px);
        }

        .lb-iso-visualizer.lb-theme-dark .metric-card {
          background: rgba(34, 30, 44, 0.94);
          border-color: #463f57;
          box-shadow: 0 2px 10px rgba(6, 5, 12, 0.4);
        }

        .lb-iso-visualizer.lb-theme-dark .metric-card__header {
          color: #a99fc2;
        }

        .lb-iso-visualizer.lb-theme-dark .metric-card__value {
          color: #f6f2ff;
        }

        .lb-iso-visualizer.lb-theme-dark #metric-dns {
          color: #ffd166;
        }

        .lb-iso-visualizer.lb-theme-dark #metric-connect {
          color: #7cc0ff;
        }

        .lb-iso-visualizer.lb-theme-dark #metric-server {
          color: #c4b5fd;
        }

        .lb-iso-visualizer.lb-theme-dark #metric-rps {
          color: #ff9472;
        }

        .lb-iso-visualizer.lb-theme-dark .metric-card__value--green {
          color: #4ade80;
        }

        .lb-iso-visualizer.lb-theme-dark .neo-btn {
          background: #262230;
          color: #f6f2ff;
          border-color: #766b8c;
          box-shadow: 0 2.5px 0 #09080d, 0 4px 10px rgba(6, 5, 12, 0.4);
        }

        .lb-iso-visualizer.lb-theme-dark .neo-btn:hover {
          background: #332d40;
          border-color: #a78bfa;
          box-shadow: 0 3.5px 0 #09080d, 0 6px 14px rgba(6, 5, 12, 0.48);
        }

        .lb-iso-visualizer.lb-theme-dark .neo-btn:active {
          box-shadow: 0 1px 0 #09080d;
        }

        .lb-iso-visualizer.lb-theme-dark .neo-btn--active {
          background: #fbbf24;
          color: #141218;
          border-color: #fde68a;
        }

        .lb-iso-visualizer.lb-theme-dark .neo-btn--active:hover {
          background: #fcd34d;
          color: #141218;
        }

        .lb-iso-visualizer.lb-theme-dark .neo-btn--accent {
          background: #472522;
          color: #ffbaa8;
          border-color: #e06c58;
        }

        .lb-iso-visualizer.lb-theme-dark .neo-btn--accent:hover {
          background: #5c2e2a;
          color: #ffd6cc;
        }

        .lb-iso-visualizer.lb-theme-dark .stepper-group {
          background: #262230;
          border-color: #766b8c;
          box-shadow: 0 2.5px 0 #09080d;
        }

        .lb-iso-visualizer.lb-theme-dark .stepper-label {
          color: #f6f2ff;
          background: #1d1a26;
          border-right-color: #766b8c;
        }

        .lb-iso-visualizer.lb-theme-dark .stepper-btn {
          color: #f6f2ff;
          background: #262230;
          border-right-color: #766b8c;
        }

        .lb-iso-visualizer.lb-theme-dark .stepper-btn:hover:not(:disabled) {
          background: #a78bfa;
          color: #141218;
        }

        .lb-iso-visualizer.lb-theme-dark .rps-group {
          background: #1d1a26;
          border-color: #766b8c;
          box-shadow: 0 2.5px 0 #09080d;
        }

        .lb-iso-visualizer.lb-theme-dark .rps-btn {
          color: #b4a9cc;
          border-right-color: #766b8c;
        }

        .lb-iso-visualizer.lb-theme-dark .rps-btn:hover {
          background: #2e293b;
          color: #f6f2ff;
        }

        .lb-iso-visualizer.lb-theme-dark .rps-btn.active {
          background: #fbbf24;
          color: #141218;
        }

        .lb-iso-visualizer.lb-theme-dark .hud-bottom-legend {
          color: #b4a9cc;
        }

        .lb-iso-visualizer.lb-theme-dark .legend-dot {
          border-color: #141218;
        }

        .lb-iso-visualizer.lb-theme-dark .legend-dot--req {
          background: #ff7b54;
        }

        .lb-iso-visualizer.lb-theme-dark .legend-dot--res {
          background: #4ade80;
        }

        .lb-iso-visualizer.lb-theme-dark .legend-dot--hand {
          background: #1e1b24;
          border-color: #38bdf8;
        }

        .lb-iso-visualizer.lb-theme-dark .zoom-pill {
          background: #262230;
          border-color: #766b8c;
          box-shadow: 0 2.5px 0 #09080d;
        }

        .lb-iso-visualizer.lb-theme-dark .zoom-btn {
          color: #f6f2ff;
        }

        .lb-iso-visualizer.lb-theme-dark .zoom-btn:hover {
          background: #332d40;
        }

        .lb-iso-visualizer.lb-theme-dark .zoom-readout {
          color: #f6f2ff;
          border-left-color: #766b8c;
          border-right-color: #766b8c;
        }
      `}</style>

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
            Fit View
          </button>
        </div>
      </div>
    </>
  );
}

export default function Visualizer3D({ theme, onThemeChange, onSelectNode, selectedNode } = {}) {
  return <LoadBalancerVisualizer theme={theme} onThemeChange={onThemeChange} />;
}














