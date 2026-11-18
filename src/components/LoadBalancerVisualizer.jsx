import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';

// ============================================================================
// TRUE 2:1 ISOMETRIC PROJECTION & GEOMETRY ENGINE
// ============================================================================
const COS30 = 0.8660254037844386;
const SIN30 = 0.5;
const SCALE = 36;
const ORIGIN_X = 760;
const ORIGIN_Y = 470;
const SVG_NS = 'http://www.w3.org/2000/svg';

function isoProject(u, v, z = 0) {
  return {
    x: ORIGIN_X + (u - v) * COS30 * SCALE,
    y: ORIGIN_Y + (u + v) * SIN30 * SCALE - z * SCALE,
  };
}

function lerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * True Isometric Rounded-Corner Diamond Path (Top or Bottom contour at height z)
 */
function buildIsoRoundedDiamond(cu, cv, du, dv, r, z = 0) {
  const hu = du / 2;
  const hv = dv / 2;
  const cr = Math.min(r, hu * 0.46, hv * 0.46);

  const B = isoProject(cu - hu, cv - hv, z);
  const R = isoProject(cu + hu, cv - hv, z);
  const F = isoProject(cu + hu, cv + hv, z);
  const L = isoProject(cu - hu, cv + hv, z);

  const B_in = isoProject(cu - hu, cv - hv + cr, z);
  const B_out = isoProject(cu - hu + cr, cv - hv, z);

  const R_in = isoProject(cu + hu - cr, cv - hv, z);
  const R_out = isoProject(cu + hu, cv - hv + cr, z);

  const F_in = isoProject(cu + hu, cv + hv - cr, z);
  const F_out = isoProject(cu + hu - cr, cv + hv, z);

  const L_in = isoProject(cu - hu + cr, cv + hv, z);
  const L_out = isoProject(cu - hu, cv + hv - cr, z);

  const d = [
    `M ${B_out.x.toFixed(2)} ${B_out.y.toFixed(2)}`,
    `L ${R_in.x.toFixed(2)} ${R_in.y.toFixed(2)}`,
    `Q ${R.x.toFixed(2)} ${R.y.toFixed(2)} ${R_out.x.toFixed(2)} ${R_out.y.toFixed(2)}`,
    `L ${F_in.x.toFixed(2)} ${F_in.y.toFixed(2)}`,
    `Q ${F.x.toFixed(2)} ${F.y.toFixed(2)} ${F_out.x.toFixed(2)} ${F_out.y.toFixed(2)}`,
    `L ${L_in.x.toFixed(2)} ${L_in.y.toFixed(2)}`,
    `Q ${L.x.toFixed(2)} ${L.y.toFixed(2)} ${L_out.x.toFixed(2)} ${L_out.y.toFixed(2)}`,
    `L ${B_in.x.toFixed(2)} ${B_in.y.toFixed(2)}`,
    `Q ${B.x.toFixed(2)} ${B.y.toFixed(2)} ${B_out.x.toFixed(2)} ${B_out.y.toFixed(2)}`,
    'Z',
  ].join(' ');

  return {
    d,
    pts: { B, R, F, L, B_in, B_out, R_in, R_out, F_in, F_out, L_in, L_out },
  };
}

/**
 * Extruded 3D Side Walls (Left Face, Right Face, Front Corner Bevel & Full Silhouette)
 */
function buildIsoBlockWalls(cu, cv, du, dv, r, h) {
  const top = buildIsoRoundedDiamond(cu, cv, du, dv, r, h);
  const bot = buildIsoRoundedDiamond(cu, cv, du, dv, r, 0);
  const T = top.pts;
  const G = bot.pts;

  const tL = lerpPt(lerpPt(T.L_out, T.L, 0.5), lerpPt(T.L, T.L_in, 0.5), 0.5);
  const gL = lerpPt(lerpPt(G.L_out, G.L, 0.5), lerpPt(G.L, G.L_in, 0.5), 0.5);

  const tR = lerpPt(lerpPt(T.R_in, T.R, 0.5), lerpPt(T.R, T.R_out, 0.5), 0.5);
  const gR = lerpPt(lerpPt(G.R_in, G.R, 0.5), lerpPt(G.R, G.R_out, 0.5), 0.5);

  const tF = lerpPt(lerpPt(T.F_in, T.F, 0.5), lerpPt(T.F, T.F_out, 0.5), 0.5);
  const gF = lerpPt(lerpPt(G.F_in, G.F, 0.5), lerpPt(G.F, G.F_out, 0.5), 0.5);

  const leftWallD = [
    `M ${tL.x.toFixed(2)} ${tL.y.toFixed(2)}`,
    `Q ${T.L.x.toFixed(2)} ${T.L.y.toFixed(2)} ${T.L_in.x.toFixed(2)} ${T.L_in.y.toFixed(2)}`,
    `L ${T.F_out.x.toFixed(2)} ${T.F_out.y.toFixed(2)}`,
    `Q ${T.F.x.toFixed(2)} ${T.F.y.toFixed(2)} ${tF.x.toFixed(2)} ${tF.x.toFixed(2)}`,
    `L ${gF.x.toFixed(2)} ${gF.y.toFixed(2)}`,
    `Q ${G.F.x.toFixed(2)} ${G.F.y.toFixed(2)} ${G.F_out.x.toFixed(2)} ${G.F_out.y.toFixed(2)}`,
    `L ${G.L_in.x.toFixed(2)} ${G.L_in.y.toFixed(2)}`,
    `Q ${G.L.x.toFixed(2)} ${G.L.y.toFixed(2)} ${gL.x.toFixed(2)} ${gL.y.toFixed(2)}`,
    'Z',
  ].join(' ');

  const rightWallD = [
    `M ${tF.x.toFixed(2)} ${tF.y.toFixed(2)}`,
    `Q ${T.F.x.toFixed(2)} ${T.F.y.toFixed(2)} ${T.F_in.x.toFixed(2)} ${T.F_in.y.toFixed(2)}`,
    `L ${T.R_out.x.toFixed(2)} ${T.R_out.y.toFixed(2)}`,
    `Q ${T.R.x.toFixed(2)} ${T.R.y.toFixed(2)} ${tR.x.toFixed(2)} ${tR.y.toFixed(2)}`,
    `L ${gR.x.toFixed(2)} ${gR.y.toFixed(2)}`,
    `Q ${G.R.x.toFixed(2)} ${G.R.y.toFixed(2)} ${G.R_out.x.toFixed(2)} ${G.R_out.y.toFixed(2)}`,
    `L ${G.F_in.x.toFixed(2)} ${G.F_in.y.toFixed(2)}`,
    `Q ${G.F.x.toFixed(2)} ${G.F.y.toFixed(2)} ${gF.x.toFixed(2)} ${gF.y.toFixed(2)}`,
    'Z',
  ].join(' ');

  const frontCornerD = [
    `M ${T.F_out.x.toFixed(2)} ${T.F_out.y.toFixed(2)}`,
    `Q ${T.F.x.toFixed(2)} ${T.F.y.toFixed(2)} ${T.F_in.x.toFixed(2)} ${T.F_in.y.toFixed(2)}`,
    `L ${G.F_in.x.toFixed(2)} ${G.F_in.y.toFixed(2)}`,
    `Q ${G.F.x.toFixed(2)} ${G.F.y.toFixed(2)} ${G.F_out.x.toFixed(2)} ${G.F_out.y.toFixed(2)}`,
    'Z',
  ].join(' ');

  const frontHighlightD = [
    `M ${T.L_out.x.toFixed(2)} ${T.L_out.y.toFixed(2)}`,
    `Q ${T.L.x.toFixed(2)} ${T.L.y.toFixed(2)} ${T.L_in.x.toFixed(2)} ${T.L_in.y.toFixed(2)}`,
    `L ${T.F_out.x.toFixed(2)} ${T.F_out.y.toFixed(2)}`,
    `Q ${T.F.x.toFixed(2)} ${T.F.y.toFixed(2)} ${tF.x.toFixed(2)} ${tF.x.toFixed(2)}`,
    `L ${T.R_out.x.toFixed(2)} ${T.R_out.y.toFixed(2)}`,
    `Q ${T.R.x.toFixed(2)} ${T.R.y.toFixed(2)} ${T.R_in.x.toFixed(2)} ${T.R_in.y.toFixed(2)}`,
  ].join(' ');

  const outlineD = [
    `M ${T.B_out.x.toFixed(2)} ${T.B_out.y.toFixed(2)}`,
    `L ${T.R_in.x.toFixed(2)} ${T.R_in.y.toFixed(2)}`,
    `Q ${T.R.x.toFixed(2)} ${T.R.y.toFixed(2)} ${tR.x.toFixed(2)} ${tR.y.toFixed(2)}`,
    `L ${gR.x.toFixed(2)} ${gR.y.toFixed(2)}`,
    `Q ${G.R.x.toFixed(2)} ${G.R.y.toFixed(2)} ${G.R_out.x.toFixed(2)} ${G.R_out.y.toFixed(2)}`,
    `L ${G.F_in.x.toFixed(2)} ${G.F_in.y.toFixed(2)}`,
    `Q ${G.F.x.toFixed(2)} ${G.F.y.toFixed(2)} ${G.F_out.x.toFixed(2)} ${G.F_out.y.toFixed(2)}`,
    `L ${G.L_in.x.toFixed(2)} ${G.L_in.y.toFixed(2)}`,
    `Q ${G.L.x.toFixed(2)} ${G.L.y.toFixed(2)} ${gL.x.toFixed(2)} ${gL.y.toFixed(2)}`,
    `L ${tL.x.toFixed(2)} ${tL.y.toFixed(2)}`,
    `Q ${T.L.x.toFixed(2)} ${T.L.y.toFixed(2)} ${T.L_out.x.toFixed(2)} ${T.L_out.y.toFixed(2)}`,
    `L ${T.B_in.x.toFixed(2)} ${T.B_in.y.toFixed(2)}`,
    `Q ${T.B.x.toFixed(2)} ${T.B.y.toFixed(2)} ${T.B_out.x.toFixed(2)} ${T.B_out.y.toFixed(2)}`,
    'Z',
  ].join(' ');

  return {
    topD: top.d,
    bottomD: bot.d,
    leftWallD,
    rightWallD,
    frontCornerD,
    frontHighlightD,
    outlineD,
  };
}

/**
 * Rounded Orthogonal Isometric Polyline for non-overlapping PCB wire buses
 */
function buildRoundedIsoPolyline(uvPoints, cornerRadius = 0.42) {
  const pts = uvPoints.map((p) => isoProject(p.u, p.v, p.z || 0));
  if (pts.length < 2) return '';

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2);

    const rPx = Math.min(cornerRadius * SCALE, len1 * 0.45, len2 * 0.45);
    if (len1 < 2 || len2 < 2 || rPx < 1.5) {
      d += ` L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
      continue;
    }

    const pA = {
      x: curr.x - (dx1 / len1) * rPx,
      y: curr.y - (dy1 / len1) * rPx,
    };
    const pB = {
      x: curr.x + (dx2 / len2) * rPx,
      y: curr.y + (dy2 / len2) * rPx,
    };

    d += ` L ${pA.x.toFixed(2)} ${pA.y.toFixed(2)} Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${pB.x.toFixed(2)} ${pB.y.toFixed(2)}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  return d;
}

/**
 * Arrowhead polygon aligned with wire tangent
 */
function buildArrowPoints(tipX, tipY, dirX, dirY, len = 11.5, wing = 6.2) {
  const mag = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / mag;
  const uy = dirY / mag;
  const px = -uy;
  const py = ux;

  const bx = tipX - ux * len;
  const by = tipY - uy * len;

  const p1x = bx + px * wing;
  const p1y = by + py * wing;
  const p2x = bx - px * wing;
  const p2y = by - py * wing;
  const mx = tipX - ux * (len * 0.78);
  const my = tipY - uy * (len * 0.78);

  return `${tipX.toFixed(2)},${tipY.toFixed(2)} ${p1x.toFixed(2)},${p1y.toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)} ${p2x.toFixed(2)},${p2y.toFixed(2)}`;
}

/**
 * Pre-samples an SVG path string into 512 equidistant arc-length points + normals
 */
function samplePathStringToLUT(pathD, samples = 512) {
  const tempPath = document.createElementNS(SVG_NS, 'path');
  tempPath.setAttribute('d', pathD);
  const totalLen = tempPath.getTotalLength() || 1;
  const lut = new Float32Array((samples + 1) * 4);

  for (let i = 0; i <= samples; i++) {
    const dist = (i / samples) * totalLen;
    const pt = tempPath.getPointAtLength(dist);
    const d0 = Math.max(0, dist - 1.5);
    const d1 = Math.min(totalLen, dist + 1.5);
    const p0 = tempPath.getPointAtLength(d0);
    const p1 = tempPath.getPointAtLength(d1);
    const tx = p1.x - p0.x;
    const ty = p1.y - p0.y;
    const mag = Math.hypot(tx, ty) || 1;
    // Perpendicular unit normal (-ty, tx)
    lut[i * 4] = pt.x;
    lut[i * 4 + 1] = pt.y;
    lut[i * 4 + 2] = -ty / mag;
    lut[i * 4 + 3] = tx / mag;
  }

  const s0 = tempPath.getPointAtLength(0);
  const s1 = tempPath.getPointAtLength(Math.min(totalLen, 10));
  const e0 = tempPath.getPointAtLength(totalLen);
  const e1 = tempPath.getPointAtLength(Math.max(0, totalLen - 10));

  return {
    lut,
    samples,
    totalLen,
    startPt: s0,
    startDir: { x: s0.x - s1.x, y: s0.y - s1.y },
    endPt: e0,
    endDir: { x: e0.x - e1.x, y: e0.y - e1.y },
  };
}

function evaluateRouteLUT(route, t, laneOffsetPx = 0) {
  const clamped = Math.max(0, Math.min(1, t));
  const exact = clamped * route.samples;
  const idx0 = Math.floor(exact);
  const idx1 = Math.min(route.samples, idx0 + 1);
  const frac = exact - idx0;

  const b0 = idx0 * 4;
  const b1 = idx1 * 4;
  const x = route.lut[b0] + (route.lut[b1] - route.lut[b0]) * frac;
  const y = route.lut[b0 + 1] + (route.lut[b1 + 1] - route.lut[b0 + 1]) * frac;
  const nx = route.lut[b0 + 2] + (route.lut[b1 + 2] - route.lut[b0 + 2]) * frac;
  const ny = route.lut[b0 + 3] + (route.lut[b1 + 3] - route.lut[b0 + 3]) * frac;

  return {
    x: x + nx * laneOffsetPx,
    y: y + ny * laneOffsetPx,
  };
}

// ============================================================================
// NON-OVERLAPPING NESTED PCB ISOMETRIC ROUTE GENERATORS
// ============================================================================
function computeClientRouteUV(idx, total, clientU, clientV, lbU, lbV) {
  const mid = (total - 1) / 2;
  const rel = idx - mid;
  const portV = lbV - rel * 0.42;
  const lbPortU = lbU - 1.54;
  const startU = clientU + 1.48;
  const startV = clientV;

  // Strictly nested turning channels: inner devices turn closer to LB
  const distFromCenter = Math.abs(rel);
  const maxDist = Math.max(1, mid);
  const nestingRatio = (maxDist - distFromCenter) / maxDist;
  const turnU = -3.7 + nestingRatio * 1.35;

  return [
    { u: startU, v: startV, z: 0 },
    { u: turnU, v: startV, z: 0 },
    { u: turnU, v: portV, z: 0 },
    { u: lbPortU, v: portV, z: 0 },
  ];
}

function computeServerRouteUV(idx, total, srvU, srvV, lbU, lbV) {
  const mid = (total - 1) / 2;
  const rel = idx - mid;
  const portV = lbV - rel * 0.46;
  const lbPortU = lbU + 1.54;
  const endU = srvU - 1.52;
  const endV = srvV;

  const distFromCenter = Math.abs(rel);
  const maxDist = Math.max(1, mid);
  const nestingRatio = (maxDist - distFromCenter) / maxDist;
  const turnU = 3.55 - nestingRatio * 1.25;

  return [
    { u: lbPortU, v: portV, z: 0 },
    { u: turnU, v: portV, z: 0 },
    { u: turnU, v: endV, z: 0 },
    { u: endU, v: endV, z: 0 },
  ];
}

// ============================================================================
// SUB-COMPONENTS: LAPTOP ON PLUSH PAD, LOAD BALANCER, SERVER & PILLS
// ============================================================================
const IsometricLaptopNode = React.memo(function IsometricLaptopNode({ cu, cv, padH = 0.42 }) {
  const lCu = cu - 0.12;
  const lCv = cv - 0.08;
  const z0 = padH;

  // 1. Laptop Contact Shadow
  const shadowPath = buildIsoRoundedDiamond(lCu + 0.05, lCv + 0.05, 1.34, 1.62, 0.16, z0 + 0.005).d;

  // 2. Laptop Screen Back & Bezel
  const uHinge = lCu - 0.52;
  const vL = lCv - 0.72;
  const vR = lCv + 0.72;
  const scrZ0 = z0 + 0.07;
  const scrZ1 = z0 + 1.32;
  const tiltU = -0.15;
  const depthU = -0.095;

  const fBL = isoProject(uHinge, vL, scrZ0);
  const fBR = isoProject(uHinge, vR, scrZ0);
  const fTR = isoProject(uHinge + tiltU, vR, scrZ1);
  const fTL = isoProject(uHinge + tiltU, vL, scrZ1);

  const bBL = isoProject(uHinge + depthU, vL, scrZ0);
  const bBR = isoProject(uHinge + depthU, vR, scrZ0);
  const bTR = isoProject(uHinge + tiltU + depthU, vR, scrZ1);
  const bTL = isoProject(uHinge + tiltU + depthU, vL, scrZ1);

  const lidSideD = `M ${bBL.x.toFixed(1)} ${bBL.y.toFixed(1)} L ${bTL.x.toFixed(1)} ${bTL.y.toFixed(1)} L ${bTR.x.toFixed(1)} ${bTR.y.toFixed(1)} L ${fTR.x.toFixed(1)} ${fTR.y.toFixed(1)} L ${fTL.x.toFixed(1)} ${fTL.y.toFixed(1)} L ${fBL.x.toFixed(1)} ${fBL.y.toFixed(1)} Z`;
  const bezelD = `M ${fBL.x.toFixed(1)} ${fBL.y.toFixed(1)} L ${fTL.x.toFixed(1)} ${fTL.y.toFixed(1)} L ${fTR.x.toFixed(1)} ${fTR.y.toFixed(1)} L ${fBR.x.toFixed(1)} ${fBR.y.toFixed(1)} Z`;
  const glossD = `M ${bTL.x.toFixed(1)} ${(bTL.y + 4).toFixed(1)} L ${bTL.x.toFixed(1)} ${bTL.y.toFixed(1)} L ${fTL.x.toFixed(1)} ${fTL.y.toFixed(1)} L ${(fTL.x + (fTR.x - fTL.x) * 0.22).toFixed(1)} ${(fTL.y + (fTR.y - fTL.y) * 0.22).toFixed(1)}`;

  const sPt = (uRatio, vRatio) => {
    const u = uHinge + tiltU * vRatio;
    const v = vL + (vR - vL) * uRatio;
    const z = scrZ0 + (scrZ1 - scrZ0) * vRatio;
    return isoProject(u, v, z);
  };

  const vpBL = sPt(0.06, 0.08);
  const vpBR = sPt(0.94, 0.08);
  const vpTR = sPt(0.94, 0.91);
  const vpTL = sPt(0.06, 0.91);
  const vpD = `M ${vpBL.x.toFixed(1)} ${vpBL.y.toFixed(1)} L ${vpTL.x.toFixed(1)} ${vpTL.y.toFixed(1)} L ${vpTR.x.toFixed(1)} ${vpTR.y.toFixed(1)} L ${vpBR.x.toFixed(1)} ${vpBR.y.toFixed(1)} Z`;

  const tbBL = sPt(0.06, 0.75);
  const tbBR = sPt(0.94, 0.75);
  const tbD = `M ${tbBL.x.toFixed(1)} ${tbBL.y.toFixed(1)} L ${vpTL.x.toFixed(1)} ${vpTL.y.toFixed(1)} L ${vpTR.x.toFixed(1)} ${vpTR.y.toFixed(1)} L ${tbBR.x.toFixed(1)} ${tbBR.y.toFixed(1)} Z`;

  const dot1 = sPt(0.13, 0.83);
  const dot2 = sPt(0.2, 0.83);
  const dot3 = sPt(0.27, 0.83);

  const urlBL = sPt(0.35, 0.79);
  const urlBR = sPt(0.88, 0.79);
  const urlTR = sPt(0.88, 0.87);
  const urlTL = sPt(0.35, 0.87);
  const urlD = `M ${urlBL.x.toFixed(1)} ${urlBL.y.toFixed(1)} L ${urlTL.x.toFixed(1)} ${urlTL.y.toFixed(1)} L ${urlTR.x.toFixed(1)} ${urlTR.y.toFixed(1)} L ${urlBR.x.toFixed(1)} ${urlBR.y.toFixed(1)} Z`;

  const hBL = sPt(0.12, 0.4);
  const hBR = sPt(0.88, 0.4);
  const hTR = sPt(0.88, 0.69);
  const hTL = sPt(0.12, 0.69);
  const heroD = `M ${hBL.x.toFixed(1)} ${hBL.y.toFixed(1)} L ${hTL.x.toFixed(1)} ${hTL.y.toFixed(1)} L ${hTR.x.toFixed(1)} ${hTR.y.toFixed(1)} L ${hBR.x.toFixed(1)} ${hBR.y.toFixed(1)} Z`;

  const l1BL = sPt(0.12, 0.27);
  const l1BR = sPt(0.62, 0.27);
  const l1TR = sPt(0.62, 0.34);
  const l1TL = sPt(0.12, 0.34);
  const line1D = `M ${l1BL.x.toFixed(1)} ${l1BL.y.toFixed(1)} L ${l1TL.x.toFixed(1)} ${l1TL.y.toFixed(1)} L ${l1TR.x.toFixed(1)} ${l1TR.y.toFixed(1)} L ${l1BR.x.toFixed(1)} ${l1BR.y.toFixed(1)} Z`;

  const l2BL = sPt(0.12, 0.16);
  const l2BR = sPt(0.76, 0.16);
  const l2TR = sPt(0.76, 0.23);
  const l2TL = sPt(0.12, 0.23);
  const line2D = `M ${l2BL.x.toFixed(1)} ${l2BL.y.toFixed(1)} L ${l2TL.x.toFixed(1)} ${l2TL.y.toFixed(1)} L ${l2TR.x.toFixed(1)} ${l2TR.y.toFixed(1)} L ${l2BR.x.toFixed(1)} ${l2BR.y.toFixed(1)} Z`;

  // 3. Laptop Base Deck, 4x10 Keycaps & Trackpad
  const deckWalls = buildIsoBlockWalls(lCu, lCv, 1.24, 1.54, 0.15, 0.08);
  const deckZ = z0 + 0.08;
  const deckShiftY = -z0 * SCALE;

  const keysDList = [];
  const rows = 4;
  const cols = 10;
  const kbU0 = lCu - 0.44;
  const kbU1 = lCu + 0.12;
  const kbV0 = lCv - 0.64;
  const kbV1 = lCv + 0.64;
  const stepU = (kbU1 - kbU0) / rows;
  const stepV = (kbV1 - kbV0) / cols;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const kcu = kbU0 + (r + 0.5) * stepU;
      const kcv = kbV0 + (c + 0.5) * stepV;
      keysDList.push(buildIsoRoundedDiamond(kcu, kcv, stepU * 0.74, stepV * 0.74, 0.02, deckZ + 0.005).d);
    }
  }

  const tpD = buildIsoRoundedDiamond(lCu + 0.34, lCv, 0.28, 0.52, 0.04, deckZ + 0.005).d;

  return (
    <g>
      <path d={shadowPath} fill="rgba(35,35,35,0.12)" />
      {/* Extruded 3D Screen Lid */}
      <path d={lidSideD} fill="#3d3a36" stroke="#232323" strokeWidth="2.4" strokeLinejoin="round" />
      <path d={bezelD} fill="#232323" stroke="#232323" strokeWidth="2.4" strokeLinejoin="round" />
      <path d={glossD} fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.88" />
      {/* Browser Window Viewport */}
      <path d={vpD} fill="#faf7f0" />
      <path d={tbD} fill="#e8e2d5" />
      <circle cx={dot1.x.toFixed(1)} cy={dot1.y.toFixed(1)} r="2.1" fill="#f07167" />
      <circle cx={dot2.x.toFixed(1)} cy={dot2.y.toFixed(1)} r="2.1" fill="#f4be4f" />
      <circle cx={dot3.x.toFixed(1)} cy={dot3.y.toFixed(1)} r="2.1" fill="#6ec472" />
      <path d={urlD} fill="#ffffff" />
      {/* Lavender Hero & Skeleton Lines */}
      <path d={heroD} fill="#cec2f2" />
      <path d={line1D} fill="#d6d0c4" />
      <path d={line2D} fill="#d6d0c4" />
      {/* Keyboard Deck */}
      <g transform={`translate(0, ${deckShiftY.toFixed(2)})`}>
        <path d={deckWalls.leftWallD} fill="#d5cfc3" />
        <path d={deckWalls.rightWallD} fill="#c2bbb0" />
        <path d={deckWalls.topD} fill="#f4f0e8" />
        <path d={deckWalls.outlineD} fill="none" stroke="#232323" strokeWidth="2.3" strokeLinejoin="round" />
      </g>
      {/* 4x10 Isometric Keycap Grid */}
      {keysDList.map((kd, i) => (
        <path key={i} d={kd} fill="#faf8f5" stroke="#9e9689" strokeWidth="0.95" />
      ))}
      {/* Trackpad */}
      <path d={tpD} fill="#ebe5da" stroke="#968e80" strokeWidth="1.15" />
    </g>
  );
});

// ============================================================================
// DEFAULT TOPOLOGY PRESETS
// ============================================================================
const CLIENT_ARCHETYPES = [
  'Web Client 1',
  'Web Client 2',
  'API Consumer',
  'Edge Worker',
  'Mobile App',
  'IoT Gateway',
  'Cron Worker',
];

const SERVER_NAMES = [
  'Server A',
  'Server B',
  'Server C',
  'Server D',
  'Server E',
  'Server F',
  'Server G',
];

const ALGORITHMS = ['ROUND ROBIN', 'LEAST CONN', 'IP HASH'];
const RPS_OPTIONS = [12, 35, 120, 500];

// ============================================================================
// MAIN REACT 18 COMPONENT
// ============================================================================
const LoadBalancerVisualizer = forwardRef(function LoadBalancerVisualizer(
  {
    initialDeviceCount = 4,
    initialServerCount = 3,
    initialAlgorithm = 'ROUND ROBIN',
    initialRps = 35,
    showHud = true,
    className = '',
    onTopologyChange,
  },
  ref
) {
  // React Declarative State for Topology & Controls
  const [deviceCount, setDeviceCount] = useState(initialDeviceCount);
  const [algorithmIndex, setAlgorithmIndex] = useState(
    Math.max(0, ALGORITHMS.indexOf(initialAlgorithm))
  );
  const [rps, setRps] = useState(initialRps);
  const [paused, setPaused] = useState(false);

  // Server list state with persistent health/CPU/conn metrics
  const [servers, setServers] = useState(() =>
    Array.from({ length: initialServerCount }, (_, i) => ({
      id: `srv-${i}`,
      name: SERVER_NAMES[i] || `Server ${i + 1}`,
      shortLetter: (SERVER_NAMES[i] || `S${i + 1}`).replace('Server ', ''),
      cpu: [34, 48, 29, 41, 37, 52, 31][i % 7],
      connections: [12, 16, 10, 14, 11, 18, 9][i % 7],
      online: true,
    }))
  );

  // Pan & Zoom Viewport State
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const stageRef = useRef(null);

  // High-Frequency Animation Refs (Zero React Re-render Lag)
  const packetsLayerRef = useRef(null);
  const ripplesLayerRef = useRef(null);
  const toastsLayerRef = useRef(null);
  const lbArcLayerRef = useRef(null);
  const lbGlobeRef = useRef(null);
  const nodeGroupRefs = useRef(new Map());
  const serverLedRefs = useRef(new Map());

  // Mutable Simulation State inside RAF
  const simRef = useRef({
    rrCursor: 0,
    spawnAccumulator: 0,
    metricTick: 0,
    packets: [],
    packetNodes: [],
    ripples: [],
    toasts: [],
    lbArcs: [],
    nodeSprings: new Map(),
    routes: { clientRoutes: [], serverRoutes: [] },
    serversSnapshot: servers,
    deviceCountSnapshot: deviceCount,
    algorithmSnapshot: ALGORITHMS[algorithmIndex],
    rpsSnapshot: rps,
    pausedSnapshot: paused,
  });

  // Sync React state into mutable simulation ref
  useEffect(() => {
    simRef.current.serversSnapshot = servers;
    simRef.current.deviceCountSnapshot = deviceCount;
    simRef.current.algorithmSnapshot = ALGORITHMS[algorithmIndex];
    simRef.current.rpsSnapshot = rps;
    simRef.current.pausedSnapshot = paused;
    if (onTopologyChange) {
      onTopologyChange({
        deviceCount,
        servers,
        algorithm: ALGORITHMS[algorithmIndex],
        rps,
        paused,
      });
    }
  }, [servers, deviceCount, algorithmIndex, rps, paused, onTopologyChange]);

  // --------------------------------------------------------------------------
  // COMPUTE GEOMETRY & LUT ROUTES WHENEVER TOPOLOGY CHANGES
  // --------------------------------------------------------------------------
  const topology = useMemo(() => {
    const lbNode = {
      id: 'lb-main',
      u: 0,
      v: 0,
      du: 3.1,
      dv: 3.1,
      r: 0.72,
      h: 1.58,
    };

    const clientSpan = 3.55;
    const cMid = (deviceCount - 1) / 2;
    const clientNodes = Array.from({ length: deviceCount }, (_, i) => ({
      id: `client-${i}`,
      index: i,
      label: CLIENT_ARCHETYPES[i] || `Client ${i + 1}`,
      u: -6.4,
      v: (i - cMid) * clientSpan,
      du: 2.76,
      dv: 2.52,
      r: 0.56,
      h: 0.42,
    }));

    const serverCount = servers.length;
    const srvSpan = 3.65;
    const sMid = (serverCount - 1) / 2;
    const serverNodes = servers.map((srv, i) => ({
      ...srv,
      index: i,
      u: 6.4,
      v: (i - sMid) * srvSpan,
      du: 2.86,
      dv: 2.86,
      r: 0.68,
      h: 1.48,
    }));

    // Build Non-Overlapping Nested PCB Routes & Pre-Sample 512-Point LUTs
    const clientRoutes = clientNodes.map((c, i) => {
      const uvPts = computeClientRouteUV(i, deviceCount, c.u, c.v, lbNode.u, lbNode.v);
      const pathD = buildRoundedIsoPolyline(uvPts, 0.42);
      const lutData = samplePathStringToLUT(pathD, 512);
      return {
        id: `route-c-${c.id}`,
        kind: 'client-lb',
        clientIndex: i,
        clientId: c.id,
        pathD,
        ...lutData,
      };
    });

    const serverRoutes = serverNodes.map((s, i) => {
      const uvPts = computeServerRouteUV(i, serverCount, s.u, s.v, lbNode.u, lbNode.v);
      const pathD = buildRoundedIsoPolyline(uvPts, 0.42);
      const lutData = samplePathStringToLUT(pathD, 512);
      return {
        id: `route-s-${s.id}`,
        kind: 'lb-server',
        serverIndex: i,
        serverId: s.id,
        online: s.online,
        pathD,
        ...lutData,
      };
    });

    return { lbNode, clientNodes, serverNodes, clientRoutes, serverRoutes };
  }, [deviceCount, servers.length]);

  // Keep route LUTs & online flags synced in simRef
  useEffect(() => {
    simRef.current.routes = {
      clientRoutes: topology.clientRoutes,
      serverRoutes: topology.serverRoutes.map((r, idx) => ({
        ...r,
        online: servers[idx]?.online ?? true,
      })),
    };
  }, [topology, servers]);

  // Isometric Background Grid Lines (Memoized once)
  const gridPaths = useMemo(() => {
    const lines = [];
    const range = 42;
    for (let i = -range; i <= range; i += 1) {
      const p1 = isoProject(i, -range, 0);
      const p2 = isoProject(i, range, 0);
      lines.push(`M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);

      const p3 = isoProject(-range, i, 0);
      const p4 = isoProject(range, i, 0);
      lines.push(`M ${p3.x.toFixed(1)} ${p3.y.toFixed(1)} L ${p4.x.toFixed(1)} ${p4.y.toFixed(1)}`);
    }
    return lines.join(' ');
  }, []);

  // --------------------------------------------------------------------------
  // MACRO ANIMATION HELPERS (SPRING BOUNCE, PORT RIPPLE, LB ARC, MICRO-TOAST)
  // --------------------------------------------------------------------------
  const impulseNode = useCallback((nodeId, strength = 7.5) => {
    const map = simRef.current.nodeSprings;
    const cur = map.get(nodeId) || { y: 0, vy: 0 };
    cur.vy = Math.max(cur.vy, strength);
    map.set(nodeId, cur);
  }, []);

  const spawnPortRipple = useCallback((x, y, colorHex) => {
    if (!ripplesLayerRef.current || simRef.current.ripples.length > 26) return;
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', x.toFixed(1));
    circle.setAttribute('cy', y.toFixed(1));
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', colorHex);
    circle.setAttribute('stroke-width', '2.6');
    ripplesLayerRef.current.appendChild(circle);

    simRef.current.ripples.push({ el: circle, age: 0, maxAge: 0.42 });
  }, []);

  const spawnLbInternalArc = useCallback((inPt, outPt) => {
    if (!lbArcLayerRef.current || simRef.current.lbArcs.length > 14) return;
    const lbCenter = isoProject(0, 0, 1.58);
    const d = `M ${inPt.x.toFixed(1)} ${(inPt.y - 36).toFixed(1)} Q ${lbCenter.x.toFixed(1)} ${(lbCenter.y - 24).toFixed(1)} ${outPt.x.toFixed(1)} ${(outPt.y - 36).toFixed(1)}`;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#f08c65');
    path.setAttribute('stroke-width', '2.6');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-dasharray', '5 5');
    lbArcLayerRef.current.appendChild(path);

    simRef.current.lbArcs.push({ el: path, age: 0, maxAge: 0.34 });
  }, []);

  const spawnMicroToast = useCallback((x, y, text, bgHex = '#6ec472') => {
    if (!toastsLayerRef.current || simRef.current.toasts.length > 10) return;
    const g = document.createElementNS(SVG_NS, 'g');
    const w = text.length * 7.2 + 16;

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', (-w / 2).toFixed(1));
    rect.setAttribute('y', '-11');
    rect.setAttribute('width', w.toFixed(1));
    rect.setAttribute('height', '20');
    rect.setAttribute('rx', '10');
    rect.setAttribute('fill', bgHex);
    rect.setAttribute('stroke', '#232323');
    rect.setAttribute('stroke-width', '1.8');
    g.appendChild(rect);

    const txt = document.createElementNS(SVG_NS, 'text');
    txt.setAttribute('x', '0');
    txt.setAttribute('y', '2');
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('font-family', '"JetBrains Mono", monospace');
    txt.setAttribute('font-size', '9.5');
    txt.setAttribute('font-weight', '800');
    txt.setAttribute('fill', '#232323');
    txt.textContent = text;
    g.appendChild(txt);

    toastsLayerRef.current.appendChild(g);
    simRef.current.toasts.push({ el: g, x, y, age: 0, maxAge: 0.78 });
  }, []);

  // --------------------------------------------------------------------------
  // ZERO-COLLISION PACKET SPAWNER & SERVER PICKER
  // --------------------------------------------------------------------------
  const pickTargetServerRoute = useCallback(() => {
    const sim = simRef.current;
    const healthyRoutes = sim.routes.serverRoutes.filter((r) => r.online);
    if (!healthyRoutes.length) return null;

    const alg = sim.algorithmSnapshot;
    if (alg === 'ROUND ROBIN') {
      const picked = healthyRoutes[sim.rrCursor % healthyRoutes.length];
      sim.rrCursor++;
      return picked;
    }
    if (alg === 'LEAST CONN') {
      return healthyRoutes.reduce((best, curr) => {
        const sBest = sim.serversSnapshot[best.serverIndex];
        const sCurr = sim.serversSnapshot[curr.serverIndex];
        return (sCurr?.connections ?? 0) < (sBest?.connections ?? 0) ? curr : best;
      }, healthyRoutes[0]);
    }
    // IP HASH
    const idx = (sim.rrCursor * 7 + 3) % healthyRoutes.length;
    sim.rrCursor++;
    return healthyRoutes[idx];
  }, []);

  const canSpawnOnRoute = useCallback((route, dir, minHeadway = 0.25) => {
    const pkts = simRef.current.packets;
    for (let i = 0; i < pkts.length; i++) {
      const p = pkts[i];
      if (p.route === route && p.dir === dir) {
        const dist = dir === 1 ? p.t : 1 - p.t;
        if (dist < minHeadway) return false;
      }
    }
    return true;
  }, []);

  const spawnPacket = useCallback(
    (route, dir, type, speed, targetServerRoute = null, force = false) => {
      if (!route || simRef.current.packets.length >= 160) return false;
      if (!force && !canSpawnOnRoute(route, dir, 0.25)) return false;

      simRef.current.packets.push({
        route,
        t: dir === 1 ? 0.0 : 1.0,
        dir,
        type, // 0: request (#f08c65), 1: response (#78c67a)
        speed,
        targetServerRoute,
        laneOffset: 0,
      });

      const pt = dir === 1 ? route.startPt : route.endPt;
      spawnPortRipple(pt.x, pt.y, type === 0 ? '#f08c65' : '#78c67a');
      return true;
    },
    [canSpawnOnRoute, spawnPortRipple]
  );

  // --------------------------------------------------------------------------
  // CONTROLS & IMPERATIVE HANDLE (PROPS / ZUSTAND / WINDOW API)
  // --------------------------------------------------------------------------
  const toggleServer = useCallback(
    (indexOrId) => {
      setServers((prev) =>
        prev.map((s, idx) => {
          const match =
            typeof indexOrId === 'number'
              ? idx === indexOrId
              : s.id === indexOrId || s.name === indexOrId;
          if (!match) return s;
          const nextOnline = !s.online;
          const p = isoProject(6.4, (idx - (prev.length - 1) / 2) * 3.65, 1.85);
          spawnMicroToast(
            p.x,
            p.y - 14,
            nextOnline ? 'ONLINE' : 'FAILOVER',
            nextOnline ? '#6ec472' : '#f07167'
          );
          impulseNode(s.id, 10);
          return {
            ...s,
            online: nextOnline,
            cpu: nextOnline ? 28 + Math.floor(Math.random() * 18) : 0,
            connections: nextOnline ? 8 + Math.floor(Math.random() * 8) : 0,
          };
        })
      );
    },
    [impulseNode, spawnMicroToast]
  );

  const changeServerCount = useCallback((delta) => {
    setServers((prev) => {
      const nextCount = Math.max(1, Math.min(7, prev.length + delta));
      if (nextCount === prev.length) return prev;
      if (nextCount < prev.length) return prev.slice(0, nextCount);
      const added = [...prev];
      while (added.length < nextCount) {
        const i = added.length;
        added.push({
          id: `srv-${i}`,
          name: SERVER_NAMES[i] || `Server ${i + 1}`,
          shortLetter: (SERVER_NAMES[i] || `S${i + 1}`).replace('Server ', ''),
          cpu: 30 + ((i * 11) % 35),
          connections: 10 + ((i * 5) % 14),
          online: true,
        });
      }
      return added;
    });
  }, []);

  const changeDeviceCount = useCallback((delta) => {
    setDeviceCount((prev) => Math.max(1, Math.min(7, prev + delta)));
  }, []);

  const triggerBurst = useCallback(() => {
    const { clientRoutes } = simRef.current.routes;
    clientRoutes.forEach((cRoute) => {
      const targetSrv = pickTargetServerRoute();
      spawnPacket(cRoute, 1, 0, 0.72, targetSrv, true);
    });
    impulseNode('lb-main', 11);
    const lbTop = isoProject(0, 0, 1.9);
    spawnMicroToast(lbTop.x, lbTop.y - 24, 'BURST WAVE', '#f2cb78');
  }, [impulseNode, pickTargetServerRoute, spawnMicroToast, spawnPacket]);

  const fitView = useCallback(() => {
    setCamera({ x: 0, y: 0, scale: 1 });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      toggleServer,
      setDeviceCount: (count) => setDeviceCount(Math.max(1, Math.min(7, count))),
      setServerCount: (count) => {
        const clamped = Math.max(1, Math.min(7, count));
        changeServerCount(clamped - servers.length);
      },
      setAlgorithm: (algName) => {
        const idx = ALGORITHMS.indexOf(algName.toUpperCase());
        if (idx !== -1) setAlgorithmIndex(idx);
      },
      setRps: (val) => setRps(Math.max(1, Math.min(5000, val))),
      triggerBurst,
      fitView,
    }),
    [toggleServer, changeServerCount, servers.length, triggerBurst, fitView]
  );

  // Also expose on window.LoadBalancerVisualizer for external scripts
  useEffect(() => {
    window.LoadBalancerVisualizer = {
      toggleServer,
      triggerBurst,
      fitView,
      setRps: (val) => setRps(Math.max(1, Math.min(5000, val))),
    };
  }, [toggleServer, triggerBurst, fitView]);

  // --------------------------------------------------------------------------
  // 60-120 FPS ANIMATION LOOP (PACKETS, DUPLEX LANES, RIPPLES, TOASTS, SPRINGS)
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Initialize pre-allocated SVG pool of 160 packet circles
    const layer = packetsLayerRef.current;
    if (!layer) return;
    layer.innerHTML = '';
    const pool = [];

    for (let i = 0; i < 160; i++) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('visibility', 'hidden');

      const shadow = document.createElementNS(SVG_NS, 'circle');
      shadow.setAttribute('cx', '0');
      shadow.setAttribute('cy', '2.5');
      shadow.setAttribute('r', '7.2');
      shadow.setAttribute('fill', 'rgba(35,35,35,0.18)');
      g.appendChild(shadow);

      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', '0');
      circle.setAttribute('cy', '0');
      circle.setAttribute('r', '7.2');
      circle.setAttribute('fill', '#f08c65');
      circle.setAttribute('stroke', '#232323');
      circle.setAttribute('stroke-width', '2.5');
      g.appendChild(circle);

      const spec = document.createElementNS(SVG_NS, 'circle');
      spec.setAttribute('cx', '-2.2');
      spec.setAttribute('cy', '-2.2');
      spec.setAttribute('r', '2.0');
      spec.setAttribute('fill', '#ffffff');
      spec.setAttribute('opacity', '0.68');
      g.appendChild(spec);

      layer.appendChild(g);
      pool.push({ g, circle });
    }
    simRef.current.packetNodes = pool;

    let rafId;
    let lastTime = performance.now();

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      const sim = simRef.current;

      // 1. Subtle Globe Pulse on Load Balancer
      if (lbGlobeRef.current) {
        const s = 1 + Math.sin(now * 0.004) * 0.035;
        lbGlobeRef.current.setAttribute('transform', `scale(${s.toFixed(3)})`);
      }

      // 2. Blinking Server Rack Status LEDs
      serverLedRefs.current.forEach((leds, srvId) => {
        const srv = sim.serversSnapshot.find((s) => s.id === srvId);
        if (!srv || !srv.online || !leds) return;
        const blink = Math.sin(now * 0.012 + srv.index * 2.1) > -0.2;
        if (leds.top) leds.top.setAttribute('fill', blink ? '#6ec472' : '#b7e3b9');
        if (leds.bot) leds.bot.setAttribute('fill', !blink ? '#6ec472' : '#58b35c');
      });

      if (!sim.pausedSnapshot) {
        // 3. Spawn Traffic Waves
        const visualWaveRate = Math.min(26, Math.pow(sim.rpsSnapshot, 0.56) * 1.15);
        sim.spawnAccumulator += dt * visualWaveRate;

        const { clientRoutes } = sim.routes;
        while (sim.spawnAccumulator >= 1 && clientRoutes.length > 0) {
          sim.spawnAccumulator -= 1;
          const cRoute = clientRoutes[Math.floor(Math.random() * clientRoutes.length)];
          const targetSrvRoute = pickTargetServerRoute();
          const speed = 0.52 + Math.min(0.55, Math.log10(sim.rpsSnapshot + 1) * 0.18);
          spawnPacket(cRoute, 1, 0, speed, targetSrvRoute, false);
        }

        // 4. Advance Packets & Compute Duplex Passing Lanes
        const pkts = sim.packets;
        for (let i = pkts.length - 1; i >= 0; i--) {
          const p = pkts[i];
          p.t += p.dir * p.speed * dt;

          let hasOpposing = false;
          for (let j = 0; j < pkts.length; j++) {
            if (i !== j && pkts[j].route === p.route && pkts[j].dir !== p.dir) {
              if (Math.abs(pkts[j].t - p.t) < 0.24) {
                hasOpposing = true;
                break;
              }
            }
          }
          const targetOffset = hasOpposing ? (p.dir === 1 ? -6.8 : 6.8) : 0;
          p.laneOffset += (targetOffset - p.laneOffset) * Math.min(1, dt * 15);

          // Arrival handling
          if (p.dir === 1 && p.t >= 1.0) {
            spawnPortRipple(p.route.endPt.x, p.route.endPt.y, '#f08c65');

            if (p.route.kind === 'client-lb') {
              impulseNode('lb-main', 5.2);
              const outRoute = p.targetServerRoute || pickTargetServerRoute();
              if (outRoute && outRoute.online) {
                spawnLbInternalArc(p.route.endPt, outRoute.startPt);
                spawnPacket(outRoute, 1, 0, p.speed * 1.04, null, false);
              }
            } else if (p.route.kind === 'lb-server') {
              const sIdx = p.route.serverIndex;
              const srv = sim.serversSnapshot[sIdx];
              if (srv && srv.online) {
                impulseNode(srv.id, 6.2);
                if (Math.random() < 0.25) {
                  const sTop = isoProject(
                    6.4,
                    (sIdx - (sim.serversSnapshot.length - 1) / 2) * 3.65,
                    1.8
                  );
                  spawnMicroToast(sTop.x, sTop.y - 12, '200 OK', '#78c67a');
                }
                spawnPacket(p.route, -1, 1, p.speed * 1.05, null, false);
              }
            }
            pkts.splice(i, 1);
            continue;
          }

          if (p.dir === -1 && p.t <= 0.0) {
            spawnPortRipple(p.route.startPt.x, p.route.startPt.y, '#78c67a');
            if (p.route.kind === 'lb-server') {
              impulseNode('lb-main', 4.0);
              if (clientRoutes.length > 0) {
                const cRoute = clientRoutes[Math.floor(Math.random() * clientRoutes.length)];
                spawnPacket(cRoute, -1, 1, p.speed, null, false);
              }
            } else if (p.route.kind === 'client-lb') {
              impulseNode(p.route.clientId, 4.5);
            }
            pkts.splice(i, 1);
            continue;
          }
        }
      }

      // 5. Sync Packet Pool DOM Nodes
      const activeCount = sim.packets.length;
      for (let i = 0; i < pool.length; i++) {
        const node = pool[i];
        if (i >= activeCount) {
          node.g.setAttribute('visibility', 'hidden');
          continue;
        }
        const p = sim.packets[i];
        const pos = evaluateRouteLUT(p.route, p.t, p.laneOffset);
        const edgeDist = Math.min(p.t, 1 - p.t);
        const scale = edgeDist < 0.08 ? 0.35 + 0.65 * (edgeDist / 0.08) : 1.0;

        node.g.setAttribute('visibility', 'visible');
        node.g.setAttribute(
          'transform',
          `translate(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}) scale(${scale.toFixed(3)})`
        );
        node.circle.setAttribute('fill', p.type === 0 ? '#f08c65' : '#78c67a');
      }

      // 6. Update Port Ripples
      for (let i = sim.ripples.length - 1; i >= 0; i--) {
        const rp = sim.ripples[i];
        rp.age += dt;
        if (rp.age >= rp.maxAge) {
          rp.el.remove();
          sim.ripples.splice(i, 1);
          continue;
        }
        const k = rp.age / rp.maxAge;
        const ease = 1 - Math.pow(1 - k, 3);
        rp.el.setAttribute('r', (5 + ease * 15).toFixed(2));
        rp.el.setAttribute('opacity', (1 - k).toFixed(2));
        rp.el.setAttribute('stroke-width', (2.6 * (1 - k * 0.6)).toFixed(2));
      }

      // 7. Update LB Internal Switching Arcs
      for (let i = sim.lbArcs.length - 1; i >= 0; i--) {
        const arc = sim.lbArcs[i];
        arc.age += dt;
        if (arc.age >= arc.maxAge) {
          arc.el.remove();
          sim.lbArcs.splice(i, 1);
          continue;
        }
        const k = arc.age / arc.maxAge;
        arc.el.setAttribute('opacity', (1 - k).toFixed(2));
        arc.el.setAttribute('stroke-dashoffset', (-arc.age * 75).toFixed(1));
      }

      // 8. Update Floating Micro-Toasts
      for (let i = sim.toasts.length - 1; i >= 0; i--) {
        const tst = sim.toasts[i];
        tst.age += dt;
        if (tst.age >= tst.maxAge) {
          tst.el.remove();
          sim.toasts.splice(i, 1);
          continue;
        }
        const k = tst.age / tst.maxAge;
        const lift = tst.y - k * 24;
        const alpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
        tst.el.setAttribute('transform', `translate(${tst.x.toFixed(1)}, ${lift.toFixed(1)})`);
        tst.el.setAttribute('opacity', Math.max(0, alpha).toFixed(2));
      }

      // 9. Update Damped Spring Node Micro-Bounces
      sim.nodeSprings.forEach((sp, id) => {
        sp.vy -= sp.y * 190 * dt;
        sp.vy *= Math.pow(0.05, dt);
        sp.y += sp.vy * dt * 11;
        if (Math.abs(sp.y) < 0.02 && Math.abs(sp.vy) < 0.02) {
          sp.y = 0;
          sp.vy = 0;
        }
        const el = nodeGroupRefs.current.get(id);
        if (el) {
          el.setAttribute('transform', `translate(0, ${(-Math.abs(sp.y)).toFixed(2)})`);
        }
      });
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    impulseNode,
    pickTargetServerRoute,
    spawnLbInternalArc,
    spawnMicroToast,
    spawnPacket,
    spawnPortRipple,
  ]);

  // Periodic Live Server CPU & Connection Fluctuation
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setServers((prev) => {
        const healthyCount = prev.filter((s) => s.online).length;
        if (healthyCount === 0) return prev;
        const loadShare = rps / Math.max(1, healthyCount);
        return prev.map((s) => {
          if (!s.online) return { ...s, cpu: 0, connections: 0 };
          const targetCpu = Math.min(
            98,
            Math.max(14, Math.round(18 + Math.pow(loadShare, 0.48) * 7.2 + (Math.random() * 8 - 4)))
          );
          const nextCpu = Math.round(s.cpu * 0.65 + targetCpu * 0.35);
          const nextConn = Math.max(
            4,
            Math.round(8 + Math.pow(loadShare, 0.52) * 3.1 + (Math.random() * 4 - 2))
          );
          return { ...s, cpu: nextCpu, connections: nextConn };
        });
      });
    }, 900);
    return () => clearInterval(interval);
  }, [paused, rps]);

  // --------------------------------------------------------------------------
  // VIEWPORT PAN & WHEEL ZOOM HANDLERS
  // --------------------------------------------------------------------------
  const handlePointerDown = (e) => {
    if (e.target.closest('[data-interactive="true"]')) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - camera.x, y: e.clientY - camera.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    setCamera((prev) => ({
      ...prev,
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;

    setCamera((prev) => {
      const nextScale = Math.min(4.0, Math.max(0.45, prev.scale * factor));
      return {
        scale: nextScale,
        x: mx - ((mx - prev.x) / prev.scale) * nextScale,
        y: my - ((my - prev.y) / prev.scale) * nextScale,
      };
    });
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // HUD Aggregate Metrics
  const healthyServersCount = servers.filter((s) => s.online).length;
  const lbMs = healthyServersCount > 0 ? Math.max(2, Math.round(4 + Math.log10(rps + 1) * 2)) : 0;
  const rttMs =
    healthyServersCount > 0
      ? Math.round(18 + (rps / Math.max(1, healthyServersCount)) * 0.04)
      : 0;

  // Pre-build Load Balancer block geometry
  const lbWalls = useMemo(() => {
    const { lbNode } = topology;
    return buildIsoBlockWalls(lbNode.u, lbNode.v, lbNode.du, lbNode.dv, lbNode.r, lbNode.h);
  }, [topology]);

  const lbShadowD = useMemo(() => {
    const { lbNode } = topology;
    return buildIsoRoundedDiamond(
      lbNode.u + 0.14,
      lbNode.v + 0.14,
      lbNode.du * 1.03,
      lbNode.dv * 1.03,
      lbNode.r,
      0
    ).d;
  }, [topology]);

  const lbCenterTop = isoProject(0, 0, topology.lbNode.h);
  const currentAlgorithm = ALGORITHMS[algorithmIndex];

  return (
    <div
      ref={stageRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative w-full h-full min-h-[640px] bg-[#f6f1e6] overflow-hidden select-none font-mono text-[#232323] ${
        isDraggingRef.current ? 'cursor-grabbing' : 'cursor-grab'
      } ${className}`}
    >
      {/* ================================================================== */}
      {/* OPTIONAL TOP HUD BAR (Matches Reference Image 2 Cards & Controls)  */}
      {/* ================================================================== */}
      {showHud && (
        <div className="absolute top-3.5 left-4 right-4 flex flex-wrap items-start justify-between gap-3 pointer-events-none z-20">
          {/* Metric Cards */}
          <div className="flex flex-wrap gap-2 pointer-events-auto" data-interactive="true">
            <div className="bg-[#fcfaf5]/95 border-[1.5px] border-[#d5ccb8] rounded-lg px-3.5 py-2 min-w-[116px] shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#6e675c]">
                LB ROUTING
              </div>
              <div className="text-[16px] font-extrabold text-[#232323] mt-0.5">
                {healthyServersCount ? `${lbMs} ms` : 'ERR'}
              </div>
            </div>
            <div className="bg-[#fcfaf5]/95 border-[1.5px] border-[#d5ccb8] rounded-lg px-3.5 py-2 min-w-[116px] shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#6e675c]">
                BACKEND RTT
              </div>
              <div className="text-[16px] font-extrabold text-[#232323] mt-0.5">
                {healthyServersCount ? `${rttMs} ms` : 'DOWN'}
              </div>
            </div>
            <div className="bg-[#fcfaf5]/95 border-[1.5px] border-[#d5ccb8] rounded-lg px-3.5 py-2 min-w-[116px] shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#6e675c]">
                THROUGHPUT
              </div>
              <div className="text-[16px] font-extrabold text-[#232323] mt-0.5">
                {healthyServersCount ? `${rps} req/s` : '0 req/s'}
              </div>
            </div>
            <div className="bg-[#fcfaf5]/95 border-[1.5px] border-[#d5ccb8] rounded-lg px-3.5 py-2 min-w-[122px] shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#6e675c]">
                HEALTHY NODES
              </div>
              <div
                className={`text-[16px] font-extrabold mt-0.5 ${
                  healthyServersCount > 0 ? 'text-[#2e7d32]' : 'text-[#c62828]'
                }`}
              >
                {healthyServersCount} / {servers.length}
              </div>
            </div>
          </div>

          {/* Interactive Topology & Traffic Controls */}
          <div
            className="flex flex-wrap items-center gap-2 pointer-events-auto"
            data-interactive="true"
          >
            {/* +/- Devices */}
            <div className="inline-flex items-center gap-1.5 bg-[#fcfaf5] border-2 border-[#232323] rounded-lg px-2 py-1 shadow-[0_2px_0_#232323] text-xs font-bold">
              <button
                type="button"
                onClick={() => changeDeviceCount(-1)}
                disabled={deviceCount <= 1}
                className="w-5 h-5 rounded border-[1.5px] border-[#232323] bg-[#efe9dc] hover:bg-[#f2cb78] disabled:opacity-35 flex items-center justify-center font-extrabold"
              >
                −
              </button>
              <span className="px-1">{deviceCount} Devices</span>
              <button
                type="button"
                onClick={() => changeDeviceCount(1)}
                disabled={deviceCount >= 7}
                className="w-5 h-5 rounded border-[1.5px] border-[#232323] bg-[#efe9dc] hover:bg-[#f2cb78] disabled:opacity-35 flex items-center justify-center font-extrabold"
              >
                +
              </button>
            </div>

            {/* +/- Servers */}
            <div className="inline-flex items-center gap-1.5 bg-[#fcfaf5] border-2 border-[#232323] rounded-lg px-2 py-1 shadow-[0_2px_0_#232323] text-xs font-bold">
              <button
                type="button"
                onClick={() => changeServerCount(-1)}
                disabled={servers.length <= 1}
                className="w-5 h-5 rounded border-[1.5px] border-[#232323] bg-[#efe9dc] hover:bg-[#f2cb78] disabled:opacity-35 flex items-center justify-center font-extrabold"
              >
                −
              </button>
              <span className="px-1">{servers.length} Servers</span>
              <button
                type="button"
                onClick={() => changeServerCount(1)}
                disabled={servers.length >= 7}
                className="w-5 h-5 rounded border-[1.5px] border-[#232323] bg-[#efe9dc] hover:bg-[#f2cb78] disabled:opacity-35 flex items-center justify-center font-extrabold"
              >
                +
              </button>
            </div>

            {/* RPS Segmented Switch */}
            <div className="inline-flex bg-[#eae3d3] border-2 border-[#232323] rounded-lg p-0.5 shadow-[0_2px_0_#232323]">
              {RPS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setRps(opt)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                    rps === opt ? 'bg-[#232323] text-[#fcfaf5]' : 'text-[#232323]'
                  }`}
                >
                  {opt}/s
                </button>
              ))}
            </div>

            {/* Algorithm Button */}
            <button
              type="button"
              onClick={() => setAlgorithmIndex((i) => (i + 1) % ALGORITHMS.length)}
              className="bg-[#fcfaf5] hover:bg-white border-2 border-[#232323] rounded-lg px-3 py-1.5 text-xs font-bold shadow-[0_2px_0_#232323] active:translate-y-0.5 transition-transform"
            >
              {currentAlgorithm}
            </button>

            {/* Burst Wave Button */}
            <button
              type="button"
              onClick={triggerBurst}
              className="bg-[#fcfaf5] hover:bg-[#fdf2d0] border-2 border-[#232323] rounded-lg px-3 py-1.5 text-xs font-bold shadow-[0_2px_0_#232323] active:translate-y-0.5 transition-transform"
            >
              ⚡ Burst Wave
            </button>

            {/* Pause / Resume Button */}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className={`border-2 border-[#232323] rounded-lg px-3 py-1.5 text-xs font-bold shadow-[0_2px_0_#232323] active:translate-y-0.5 transition-transform ${
                paused ? 'bg-[#f2cb78]' : 'bg-[#fcfaf5] hover:bg-white'
              }`}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* UNIFIED 2D ISOMETRIC VECTOR SVG SCENE                              */}
      {/* ================================================================== */}
      <svg
        viewBox="0 0 1600 960"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
      >
        <g
          transform={`translate(${camera.x.toFixed(2)}, ${camera.y.toFixed(2)}) scale(${camera.scale.toFixed(4)})`}
        >
          {/* 1. Isometric Floor Grid */}
          <path d={gridPaths} fill="none" stroke="#e4dccb" strokeWidth="1.15" />

          {/* 2. Floor Contact Shadows */}
          <g>
            {topology.clientNodes.map((c) => {
              const sh = buildIsoRoundedDiamond(
                c.u + 0.1,
                c.v + 0.1,
                c.du * 1.02,
                c.dv * 1.02,
                c.r,
                0
              );
              return <path key={`sh-${c.id}`} d={sh.d} fill="#dfd6c5" opacity="0.7" />;
            })}
            <path d={lbShadowD} fill="#dfd6c5" opacity="0.78" />
            {topology.serverNodes.map((s) => {
              const sh = buildIsoRoundedDiamond(
                s.u + 0.13,
                s.v + 0.13,
                s.du * 1.03,
                s.dv * 1.03,
                s.r,
                0
              );
              return <path key={`sh-${s.id}`} d={sh.d} fill="#dfd6c5" opacity="0.75" />;
            })}
          </g>

          {/* 3. Non-Overlapping Isometric PCB Wire Manifold & Port Terminals */}
          <g>
            {[...topology.clientRoutes, ...topology.serverRoutes].map((route) => {
              const isOffline = route.kind === 'lb-server' && !route.online;
              const strokeColor = isOffline ? '#b5ada0' : '#232323';
              return (
                <g key={route.id}>
                  <path
                    d={route.pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isOffline ? '8 7' : undefined}
                  />
                  {/* Sculpted Port Ring at Start */}
                  <circle
                    cx={route.startPt.x.toFixed(1)}
                    cy={route.startPt.y.toFixed(1)}
                    r="4.2"
                    fill="#fcfaf5"
                    stroke={strokeColor}
                    strokeWidth="2.2"
                  />
                  {/* Sculpted Port Ring at End */}
                  <circle
                    cx={route.endPt.x.toFixed(1)}
                    cy={route.endPt.y.toFixed(1)}
                    r="4.2"
                    fill="#fcfaf5"
                    stroke={strokeColor}
                    strokeWidth="2.2"
                  />
                  {/* Start & End Triangular Arrowheads */}
                  <polygon
                    points={buildArrowPoints(
                      route.startPt.x,
                      route.startPt.y,
                      route.startDir.x,
                      route.startDir.y
                    )}
                    fill={strokeColor}
                  />
                  <polygon
                    points={buildArrowPoints(
                      route.endPt.x,
                      route.endPt.y,
                      route.endDir.x,
                      route.endDir.y
                    )}
                    fill={strokeColor}
                  />
                </g>
              );
            })}
          </g>

          {/* 4. Port Ripples Layer (Mutated at 60-120 FPS via ref) */}
          <g ref={ripplesLayerRef} />

          {/* 5. Zero-Collision Traveling Packets Layer (Rendered UNDER 3D Blocks) */}
          <g ref={packetsLayerRef} />

          {/* 6. 3D Isometric Nodes Layer (Clients, Load Balancer, Servers) */}
          <g>
            {/* 6A. Client Cushion Pads + Detailed Laptops */}
            {topology.clientNodes.map((c) => {
              const walls = buildIsoBlockWalls(c.u, c.v, c.du, c.dv, c.r, c.h);
              return (
                <g
                  key={c.id}
                  ref={(el) => {
                    if (el) nodeGroupRefs.current.set(c.id, el);
                  }}
                >
                  <path d={walls.leftWallD} fill="#dfd8ca" />
                  <path d={walls.rightWallD} fill="#cfc6b6" />
                  <path d={walls.frontCornerD} fill="#d7d0c2" />
                  <path d={walls.topD} fill="#efeae0" />
                  <path
                    d={walls.frontHighlightD}
                    fill="none"
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path
                    d={walls.outlineD}
                    fill="none"
                    stroke="#232323"
                    strokeWidth="3.0"
                    strokeLinejoin="round"
                  />
                  <IsometricLaptopNode cu={c.u} cv={c.v} padH={c.h} />
                </g>
              );
            })}

            {/* 6B. Central Golden Amber Load Balancer Block */}
            <g
              ref={(el) => {
                if (el) nodeGroupRefs.current.set('lb-main', el);
              }}
              onClick={() => setAlgorithmIndex((i) => (i + 1) % ALGORITHMS.length)}
              data-interactive="true"
              className="cursor-pointer"
            >
              <path d={lbWalls.leftWallD} fill="#f1cf85" />
              <path d={lbWalls.rightWallD} fill="#e2bc6b" />
              <path d={lbWalls.frontCornerD} fill="#ebd08e" />
              <path d={lbWalls.topD} fill="#fdf2d0" />
              <path
                d={lbWalls.frontHighlightD}
                fill="none"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d={lbWalls.outlineD}
                fill="none"
                stroke="#232323"
                strokeWidth="3.2"
                strokeLinejoin="round"
              />

              {/* Globe Icon + Typography on Load Balancer Face */}
              <g transform={`translate(${lbCenterTop.x.toFixed(1)}, ${(lbCenterTop.y - 10).toFixed(1)})`}>
                <g ref={lbGlobeRef}>
                  <circle cx="0" cy="0" r="18" fill="none" stroke="#232323" strokeWidth="2.8" />
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="8.5"
                    ry="18"
                    fill="none"
                    stroke="#232323"
                    strokeWidth="2.5"
                  />
                  <line x1="-18" y1="0" x2="18" y2="0" stroke="#232323" strokeWidth="2.5" />
                </g>
                <text
                  x="0"
                  y="33"
                  textAnchor="middle"
                  fontFamily='"JetBrains Mono", monospace'
                  fontWeight="800"
                  fontSize="14.5"
                  fill="#232323"
                >
                  LOAD
                </text>
                <text
                  x="0"
                  y="49"
                  textAnchor="middle"
                  fontFamily='"JetBrains Mono", monospace'
                  fontWeight="800"
                  fontSize="14.5"
                  fill="#232323"
                >
                  BALANCER
                </text>
                <rect
                  x="-42"
                  y="56"
                  width="84"
                  height="15"
                  rx="7.5"
                  fill="rgba(35,35,35,0.09)"
                />
                <text
                  x="0"
                  y="66.5"
                  textAnchor="middle"
                  fontFamily='"JetBrains Mono", monospace'
                  fontWeight="700"
                  fontSize="9.2"
                  fill="#3a3327"
                >
                  {currentAlgorithm}
                </text>
              </g>
            </g>

            {/* 6C. Backend Periwinkle Blue Server Blocks */}
            {topology.serverNodes.map((s) => {
              const walls = buildIsoBlockWalls(s.u, s.v, s.du, s.dv, s.r, s.h);
              const topCenter = isoProject(s.u, s.v, s.h);
              const fillTop = s.online ? '#e7f0fd' : '#e6e2da';
              const fillLeft = s.online ? '#b6cef2' : '#cbc5ba';
              const fillRight = s.online ? '#9bb6e5' : '#b8b1a4';
              const fillCorner = s.online ? '#aac3ec' : '#c2bcb0';

              return (
                <g
                  key={s.id}
                  ref={(el) => {
                    if (el) nodeGroupRefs.current.set(s.id, el);
                  }}
                  onClick={() => toggleServer(s.index)}
                  data-interactive="true"
                  className="cursor-pointer"
                  opacity={s.online ? 1 : 0.78}
                >
                  <path d={walls.leftWallD} fill={fillLeft} />
                  <path d={walls.rightWallD} fill={fillRight} />
                  <path d={walls.frontCornerD} fill={fillCorner} />
                  <path d={walls.topD} fill={fillTop} />
                  <path
                    d={walls.frontHighlightD}
                    fill="none"
                    stroke="rgba(255,255,255,0.72)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path
                    d={walls.outlineD}
                    fill="none"
                    stroke="#232323"
                    strokeWidth="3.2"
                    strokeLinejoin="round"
                  />

                  {/* Dual Stacked Server Rack Units + Blinking Status LEDs */}
                  <g
                    transform={`translate(${topCenter.x.toFixed(1)}, ${(topCenter.y - 10).toFixed(1)})`}
                  >
                    <rect
                      x="-20"
                      y="-16"
                      width="40"
                      height="13"
                      rx="3"
                      fill="#ffffff"
                      stroke="#232323"
                      strokeWidth="2.5"
                    />
                    <line
                      x1="-13"
                      y1="-9.5"
                      x2="2"
                      y2="-9.5"
                      stroke="#232323"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle
                      ref={(el) => {
                        const prev = serverLedRefs.current.get(s.id) || {};
                        serverLedRefs.current.set(s.id, { ...prev, top: el });
                      }}
                      cx="11.5"
                      cy="-9.5"
                      r="2.4"
                      fill={s.online ? '#6ec472' : '#e05a47'}
                    />

                    <rect
                      x="-20"
                      y="1"
                      width="40"
                      height="13"
                      rx="3"
                      fill="#ffffff"
                      stroke="#232323"
                      strokeWidth="2.5"
                    />
                    <line
                      x1="-13"
                      y1="7.5"
                      x2="2"
                      y2="7.5"
                      stroke="#232323"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle
                      ref={(el) => {
                        const prev = serverLedRefs.current.get(s.id) || {};
                        serverLedRefs.current.set(s.id, { ...prev, bot: el });
                      }}
                      cx="11.5"
                      cy="7.5"
                      r="2.4"
                      fill={s.online ? '#6ec472' : '#e05a47'}
                    />

                    <text
                      x="0"
                      y="32"
                      textAnchor="middle"
                      fontFamily='"JetBrains Mono", monospace'
                      fontWeight="800"
                      fontSize="14.5"
                      fill="#232323"
                    >
                      Server {s.shortLetter}
                    </text>
                    <text
                      x="0"
                      y="47"
                      textAnchor="middle"
                      fontFamily='"JetBrains Mono", monospace'
                      fontWeight="700"
                      fontSize="10"
                      fill={s.online ? '#3c5275' : '#b3392b'}
                    >
                      {s.online ? `${s.connections} active` : 'OFFLINE'}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* 7. Load Balancer Internal Switching Arcs Layer */}
          <g ref={lbArcLayerRef} />

          {/* 8. Non-Overlapping Neo-Brutalist Pill Badges Layer */}
          <g>
            {/* 8A. Client Device Pill Badges (Anchored in open background lane behind each laptop) */}
            {topology.clientNodes.map((c) => {
              const anchor = isoProject(c.u - 2.35, c.v - 0.15, 0.25);
              const w = Math.max(128, c.label.length * 7.8 + 40);
              const h = 28;
              const rx = 14;
              return (
                <g
                  key={`pill-${c.id}`}
                  transform={`translate(${anchor.x.toFixed(1)}, ${anchor.y.toFixed(1)})`}
                >
                  <rect
                    x={(-w / 2).toFixed(1)}
                    y={(-h / 2 + 3).toFixed(1)}
                    width={w.toFixed(1)}
                    height={h}
                    rx={rx}
                    fill="#232323"
                  />
                  <rect
                    x={(-w / 2).toFixed(1)}
                    y={(-h / 2).toFixed(1)}
                    width={w.toFixed(1)}
                    height={h}
                    rx={rx}
                    fill="#fcfaf5"
                    stroke="#232323"
                    strokeWidth="2.2"
                  />
                  <g transform={`translate(${(-w / 2 + 16).toFixed(1)}, 0)`}>
                    <circle
                      cx="0"
                      cy="-3.5"
                      r="3.2"
                      fill="none"
                      stroke="#232323"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M -5.5 5.5 C -5.5 1.5 5.5 1.5 5.5 5.5"
                      fill="none"
                      stroke="#232323"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </g>
                  <text
                    x="10"
                    y="4"
                    textAnchor="middle"
                    fontFamily='"JetBrains Mono", monospace'
                    fontSize="11.5"
                    fontWeight="700"
                    fill="#232323"
                  >
                    {c.label}
                  </text>
                </g>
              );
            })}

            {/* 8B. Server Metric & ON/OFF Switch Pill Badges (Anchored in open foreground lane) */}
            {topology.serverNodes.map((s) => {
              const anchor = isoProject(s.u + 2.48, s.v + 0.1, 0.25);
              const w = 186;
              const h = 30;
              const rx = 15;
              const barW = Math.max(0, Math.min(44, (s.cpu / 100) * 44));
              const barColor = !s.online
                ? '#b5ada0'
                : s.cpu > 80
                ? '#e05a47'
                : s.cpu > 58
                ? '#e6a23c'
                : '#6ec472';

              return (
                <g
                  key={`pill-${s.id}`}
                  transform={`translate(${anchor.x.toFixed(1)}, ${anchor.y.toFixed(1)})`}
                  onClick={() => toggleServer(s.index)}
                  data-interactive="true"
                  className="cursor-pointer"
                >
                  <rect
                    x={-w / 2}
                    y={-h / 2 + 3}
                    width={w}
                    height={h}
                    rx={rx}
                    fill="#232323"
                  />
                  <rect
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    rx={rx}
                    fill="#fcfaf5"
                    stroke="#232323"
                    strokeWidth="2.2"
                  />

                  {/* Gear Icon */}
                  <g transform={`translate(${-w / 2 + 17}, 0)`}>
                    <circle
                      cx="0"
                      cy="0"
                      r="5"
                      fill="none"
                      stroke="#5c564c"
                      strokeWidth="2.2"
                      strokeDasharray="3.2 2"
                    />
                    <circle cx="0" cy="0" r="2" fill="#5c564c" />
                  </g>

                  {/* CPU Progress Bar */}
                  <rect
                    x={-w / 2 + 30}
                    y="-4.5"
                    width="44"
                    height="9"
                    rx="4.5"
                    fill="#e6dfd1"
                    stroke="#232323"
                    strokeWidth="1.2"
                  />
                  <rect
                    x={-w / 2 + 30}
                    y="-4.5"
                    width={barW.toFixed(1)}
                    height="9"
                    rx="4.5"
                    fill={barColor}
                  />

                  {/* CPU % & Connections */}
                  <text
                    x="14"
                    y="4"
                    textAnchor="middle"
                    fontFamily='"JetBrains Mono", monospace'
                    fontSize="11"
                    fontWeight="800"
                    fill="#232323"
                  >
                    {s.online ? `${s.cpu}% • ${s.connections}c` : 'OFFLINE'}
                  </text>

                  {/* ON / OFF Pill Button */}
                  <rect
                    x={w / 2 - 38}
                    y="-9"
                    width="30"
                    height="18"
                    rx="9"
                    fill={s.online ? '#6ec472' : '#e05a47'}
                    stroke="#232323"
                    strokeWidth="1.6"
                  />
                  <text
                    x={w / 2 - 23}
                    y="3.5"
                    textAnchor="middle"
                    fontFamily='"JetBrains Mono", monospace'
                    fontSize="9.5"
                    fontWeight="800"
                    fill="#232323"
                  >
                    {s.online ? 'ON' : 'OFF'}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 9. Floating Micro-Toasts Layer (200 OK / FAILOVER) */}
          <g ref={toastsLayerRef} />
        </g>
      </svg>

      {/* ================================================================== */}
      {/* BOTTOM-LEFT LEGEND & BOTTOM-RIGHT ZOOM HUD                         */}
      {/* ================================================================== */}
      <div className="absolute left-4 bottom-3.5 flex items-center gap-4 text-xs font-bold text-[#524c42] bg-[#f6f1e6]/90 px-3 py-1.5 rounded-full border-[1.5px] border-[#d6cebd] pointer-events-none">
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-full bg-[#f08c65] border-2 border-[#232323] inline-block" />
          request
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-full bg-[#78c67a] border-2 border-[#232323] inline-block" />
          response
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-full bg-[#f6f1e6] border-2 border-[#4f9d52] inline-block" />
          click server or ON/OFF to failover
        </span>
      </div>

      <div
        className="absolute right-4 bottom-3.5 flex items-center gap-1.5 pointer-events-auto"
        data-interactive="true"
      >
        <button
          type="button"
          onClick={() =>
            setCamera((prev) => ({ ...prev, scale: Math.max(0.45, prev.scale / 1.18) }))
          }
          className="bg-[#fcfaf5] hover:bg-white border-2 border-[#232323] rounded-lg px-2.5 py-1 text-xs font-bold shadow-[0_2px_0_#232323]"
        >
          −
        </button>
        <span className="text-xs font-extrabold min-w-[46px] text-center">
          {Math.round(camera.scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() =>
            setCamera((prev) => ({ ...prev, scale: Math.min(4.0, prev.scale * 1.18) }))
          }
          className="bg-[#fcfaf5] hover:bg-white border-2 border-[#232323] rounded-lg px-2.5 py-1 text-xs font-bold shadow-[0_2px_0_#232323]"
        >
          +
        </button>
        <button
          type="button"
          onClick={fitView}
          className="bg-[#fcfaf5] hover:bg-white border-2 border-[#232323] rounded-lg px-2.5 py-1 text-xs font-bold shadow-[0_2px_0_#232323]"
        >
          Fit View
        </button>
      </div>
    </div>
  );
});

export default LoadBalancerVisualizer;
