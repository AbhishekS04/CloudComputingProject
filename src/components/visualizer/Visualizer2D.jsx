import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { THEMES } from './Visualizer3D';
import { useSimulationStore } from '../../store/simulationStore';
import { playDotIn, playDotOut } from '../../lib/sound';
import { getGatewayHost } from '../../lib/gatewayConfig';

const IS_LIVE_BACKEND = true;

// =========================================================================
// 1. CONSTANTS & PRESET DATA
// =========================================================================
const ALGORITHMS = ['ROUND ROBIN', 'LEAST CONN', 'IP HASH'];
const RPS_OPTIONS = [
  { value: 12, label: '12/s' },
  { value: 45, label: '45/s' },
  { value: 180, label: '180/s' },
  { value: 1000, label: '1K/s' },
  { value: 5000, label: '5K/s' }
];

const CLIENT_PRESETS = [
  { id: 'c1', name: 'Web Client 1', ip: '198.51.100.4',  region: 'NA-East',    dashed: false, type: 'laptop' },
  { id: 'c2', name: 'Mobile App',   ip: '203.0.113.19',  region: 'EU-Central', dashed: true,  type: 'mobile' },
  { id: 'c3', name: 'Web Client 2', ip: '198.51.100.77', region: 'NA-West',    dashed: false, type: 'laptop' },
  { id: 'c4', name: 'API Consumer', ip: '192.0.2.145',   region: 'AP-South',   dashed: false, type: 'api' },
  { id: 'c5', name: 'Edge Worker',  ip: '203.0.113.88',  region: 'SA-East',    dashed: true,  type: 'edge' },
  { id: 'c6', name: 'IoT Gateway',  ip: '198.51.100.99', region: 'EU-North',   dashed: true,  type: 'edge' }
];

const INITIAL_SERVERS = [
  { id: 'srv-a', name: 'Server A', ip: '10.0.1.14:8080', cpu: 63, conn: 12, healthy: true },
  { id: 'srv-b', name: 'Server B', ip: '10.0.1.27:8080', cpu: 68, conn: 16, healthy: true },
  { id: 'srv-c', name: 'Server C', ip: '10.0.1.88:8080', cpu: 60, conn: 8,  healthy: true }
];

const SERVER_LETTERS = ['A', 'B', 'C', 'D', 'E'];

// =========================================================================
// 2. 1024-SAMPLE ARC-LENGTH + NORMAL LUT BUILDER
// =========================================================================
function buildRoundedOrthogonalRoute(pts2D, cornerRadius = 22) {
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

    if (len1 < 3 || len2 < 3) {
      dense.push(curr);
      svgPath += ` L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
      continue;
    }

    const r = Math.min(cornerRadius, len1 * 0.45, len2 * 0.45);
    const pA = { x: curr.x + (dx1 / len1) * r, y: curr.y + (dy1 / len1) * r };
    const pB = { x: curr.x + (dx2 / len2) * r, y: curr.y + (dy2 / len2) * r };

    svgPath += ` L ${pA.x.toFixed(2)} ${pA.y.toFixed(2)} Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${pB.x.toFixed(2)} ${pB.y.toFixed(2)}`;

    const arcSteps = 20;
    for (let s = 1; s <= arcSteps; s++) {
      const t = s / arcSteps;
      const omt = 1 - t;
      dense.push({
        x: omt * omt * pA.x + 2 * omt * t * curr.x + t * t * pB.x,
        y: omt * omt * pA.y + 2 * omt * t * curr.y + t * t * pB.y
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
    endPt: last
  };
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
    ny: route.normY[i0] + (route.normY[i1] - route.normY[i0]) * frac
  };
}

// =========================================================================
// 3. MAIN REACT APPLICATION COMPONENT
// =========================================================================
export default function Visualizer2D({
  theme,
  onThemeChange,
  onSelectNode,
  selectedNode
} = {}) {
  const isControlledTheme = theme === 'light' || theme === 'dark';
  const [internalTheme, setInternalTheme] = useState(() => {
    if (theme === 'dark' || theme === 'light') return theme;
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  const activeTheme = isControlledTheme ? theme : internalTheme;
  const isDark = activeTheme === 'dark';
  const palette = THEMES[isDark ? 'dark' : 'light'];

  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  useEffect(() => {
    if (isControlledTheme) {
      setInternalTheme(theme);
    }
  }, [theme, isControlledTheme]);

  const handleToggleTheme = useCallback(() => {
    const next = activeTheme === 'dark' ? 'light' : 'dark';
    if (!isControlledTheme) setInternalTheme(next);
    if (typeof onThemeChange === 'function') onThemeChange(next);
  }, [activeTheme, isControlledTheme, onThemeChange]);

  // --- UI & Topology State ---
  const [clients, setClients] = useState(() => CLIENT_PRESETS.slice(0, 5));
  const storeServers = useSimulationStore((state) => state.servers);
  const storeToggleServer = useSimulationStore((state) => state.toggleServerStatus);
  const storeToggleSimulation = useSimulationStore((state) => state.toggleSimulation);
  const storeIsRunning = useSimulationStore((state) => state.isRunning);
  const storeLbOnline = useSimulationStore((state) => state.lbOnline);
  const storeClusterMode = useSimulationStore((state) => state.clusterMode);
  const storeMetrics = useSimulationStore((state) => state.metrics);
  const storeTargetRps = useSimulationStore((state) => state.targetRps);
  const storeAlgorithm = useSimulationStore((state) => state.algorithm);
  const isLbOffline = IS_LIVE_BACKEND && storeClusterMode === 'live' && !storeLbOnline;
  const [servers, setServers] = useState(() => INITIAL_SERVERS);

  useEffect(() => {
    if (!storeServers || storeServers.length === 0) return;
    setServers(
      storeServers.map((s, idx) => ({
        id: s.id,
        name: s.name,
        ip: s.publicIp || s.ip,
        publicIp: s.publicIp || s.ip || '52.172.229.225:5001',
        privateIp: s.privateIp || ['10.0.1.10', '10.0.1.11', '10.0.1.12'][idx] || `10.0.1.${10 + idx}`,
        cpu: s.cpu ?? 25,
        conn: s.activeConnections ?? 0,
        totalRequests: s.totalRequests ?? 0,
        status: s.status || 'healthy',
        healthy: s.status === 'healthy'
      }))
    );
  }, [storeServers]);
  const [algoIdx, setAlgoIdx] = useState(0);
  const [targetRPS, setTargetRPS] = useState(12);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!IS_LIVE_BACKEND) return;
    setIsPaused(!storeIsRunning);
  }, [storeIsRunning]);

  useEffect(() => {
    if (!IS_LIVE_BACKEND) return;
    setTargetRPS(storeTargetRps);
  }, [storeTargetRps]);

  useEffect(() => {
    if (!IS_LIVE_BACKEND) return;
    setAlgoIdx(storeAlgorithm === 'LEAST_CONNECTIONS' ? 1 : storeAlgorithm === 'IP_HASH' ? 2 : 0);
  }, [storeAlgorithm]);

  // Live HUD Metrics
  const [metrics, setMetrics] = useState({
    dns: 18,
    dispatch: 24,
    server: 42,
    rtt: 84
  });

  // Camera Pan & Zoom State
  const [camera, setCamera] = useState({ cx: 760, cy: 455, zoom: 1.0 });
  const [viewport, setViewport] = useState({ w: 1520, h: 900 });

  // --- Mutable Physics & Direct DOM Refs (for 60-120fps Zero-GC Rendering) ---
  const stageRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startCX: 760, startCY: 455 });

  // Refs synced with latest state for animation loop
  const stateRef = useRef({
    clients,
    servers,
    algoIdx,
    targetRPS,
    isPaused
  });
  stateRef.current = { clients, servers, algoIdx, targetRPS, isPaused };

  // Pre-allocated Packet Engine Arrays
  const MAX_PACKETS = 2048;
  const SVG_PACKET_POOL = 280;
  const SVG_RIPPLE_POOL = 48;
  const SVG_TOAST_POOL = 20;
  const SVG_WAVE_POOL = 8;

  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = {
      pktActive: new Uint8Array(MAX_PACKETS),
      pktRoute: new Uint16Array(MAX_PACKETS),
      pktType: new Uint8Array(MAX_PACKETS), // 0=req, 1=res, 2=handshake
      pktDir: new Int8Array(MAX_PACKETS),   // +1 forward, -1 reverse
      pktU: new Float32Array(MAX_PACKETS),
      pktSpeed: new Float32Array(MAX_PACKETS),
      pktOrigin: new Uint8Array(MAX_PACKETS),
      pktTargetSrv: new Int16Array(MAX_PACKETS),
      pktFlags: new Uint8Array(MAX_PACKETS),
      pktLatencyMs: new Float32Array(MAX_PACKETS),
      liveQueue: [],
      clientCooldowns: new Float32Array(8),
      writeCursor: 0,
      rrCounter: 0,
      clientCursor: 0,
      spawnAcc: 0,
      metricAcc: 0,
      nodeBounces: new Map(),
      activeRipples: [],
      activeToasts: [],
      activeWaves: [],
      switchingArcFade: 0
    };
  }

  // DOM Element Refs for Direct SVG Attribute Updates
  const packetDomRefs = useRef([]);
  const rippleDomRefs = useRef([]);
  const toastDomRefs = useRef([]);
  const waveDomRefs = useRef([]);
  const clientBounceRefs = useRef({});
  const serverBounceRefs = useRef({});
  const serverLedRefs = useRef({});
  const lbBounceRef = useRef(null);
  const lbPulseRef = useRef(null);
  const lbArcRef = useRef(null);

  // =========================================================================
  // 4. NON-CROSSING PLANAR MANIFOLD LAYOUT COMPUTATION
  // =========================================================================
  const layout = useMemo(() => {
    const CX = 760;
    const LB = { id: 'lb', x: CX, y: 425, w: 320, h: 136, vip: '10.0.0.1:443' };

    // Top Row: Clients
    const nC = clients.length;
    const clientW = nC >= 6 ? 186 : 204;
    const clientH = 74;
    const clientSpacing = nC <= 3 ? 270 : nC === 4 ? 245 : nC === 5 ? 232 : 208;
    const cMid = (nC - 1) / 2;

    const positionedClients = clients.map((c, idx) => ({
      ...c,
      idx,
      x: CX + (idx - cMid) * clientSpacing,
      y: 175,
      w: clientW,
      h: clientH
    }));

    // Bottom Row: Backend Servers
    const nS = servers.length;
    const srvW = nS >= 5 ? 216 : 238;
    const srvH = 144;
    const srvSpacing = nS <= 3 ? 295 : nS === 4 ? 265 : 238;
    const sMid = (nS - 1) / 2;

    const positionedServers = servers.map((s, idx) => ({
      ...s,
      idx,
      x: CX + (idx - sMid) * srvSpacing,
      y: 705,
      w: srvW,
      h: srvH
    }));

    const routeTables = [];
    const clientRoutes = [];
    const serverRoutes = [];

    // Client -> LB Non-Crossing Manifold Wires
    // Center wire goes straight; inner pair turns at y=268; outer pair turns at y=296
    const maxCDist = Math.max(1, cMid);
    positionedClients.forEach((c, idx) => {
      const dist = Math.abs(idx - cMid);
      const portX = LB.x + (idx - cMid) * 28;
      const startY = c.y + c.h / 2 + 5;
      const endY = LB.y - LB.h / 2 - 4;
      const turnY = 266 + (dist / maxCDist) * 32;

      const pts2D =
        Math.abs(c.x - portX) < 1.5
          ? [
              { x: c.x, y: startY },
              { x: portX, y: endY }
            ]
          : [
              { x: c.x, y: startY },
              { x: c.x, y: turnY },
              { x: portX, y: turnY },
              { x: portX, y: endY }
            ];

      const route = buildRoundedOrthogonalRoute(pts2D, 20);
      const routeIdx = routeTables.length;
      routeTables.push(route);
      clientRoutes.push({
        routeIdx,
        route,
        client: c,
        startPt: pts2D[0],
        endPt: pts2D[pts2D.length - 1]
      });
    });

    // LB -> Server Non-Crossing Manifold Wires
    // Outer wires turn outward early (y=542); inner wires turn later (y=568)
    const maxSDist = Math.max(1, sMid);
    positionedServers.forEach((s, idx) => {
      const dist = Math.abs(idx - sMid);
      const portX = LB.x + (idx - sMid) * 34;
      const startY = LB.y + LB.h / 2 + 5;
      const endY = s.y - s.h / 2 - 4;
      const turnY = 568 - (dist / maxSDist) * 26;

      const pts2D =
        Math.abs(portX - s.x) < 1.5
          ? [
              { x: portX, y: startY },
              { x: s.x, y: endY }
            ]
          : [
              { x: portX, y: startY },
              { x: portX, y: turnY },
              { x: s.x, y: turnY },
              { x: s.x, y: endY }
            ];

      const route = buildRoundedOrthogonalRoute(pts2D, 22);
      const routeIdx = routeTables.length;
      routeTables.push(route);
      serverRoutes.push({
        routeIdx,
        route,
        server: s,
        startPt: pts2D[0],
        endPt: pts2D[pts2D.length - 1]
      });
    });

    return {
      LB,
      positionedClients,
      positionedServers,
      routeTables,
      clientRoutes,
      serverRoutes
    };
  }, [clients, servers]);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // =========================================================================
  // 5. MACRO EFFECTS & SPRING TRIGGER HELPERS
  // =========================================================================
  const spawnRipple = useCallback((x, y, color = null, maxR = 18) => {
    const eng = engineRef.current;
    const rippleColor = color || paletteRef.current.rippleReq;
    const idx = rippleDomRefs.current.findIndex((el, i) => el && !eng.activeRipples.some((r) => r.poolIdx === i));
    if (idx === -1) return;
    const el = rippleDomRefs.current[idx];
    el.setAttribute('cx', x.toFixed(1));
    el.setAttribute('cy', y.toFixed(1));
    el.setAttribute('stroke', rippleColor);
    el.setAttribute('display', 'inline');
    eng.activeRipples.push({ poolIdx: idx, age: 0, duration: 0.42, maxR });
  }, []);

  const spawnToast = useCallback((x, y, text, bg = null, fg = null) => {
    const eng = engineRef.current;
    const toastBg = bg || paletteRef.current.toastOkBg;
    const toastFg = fg || paletteRef.current.toastOkText;
    const idx = toastDomRefs.current.findIndex((obj, i) => obj && !eng.activeToasts.some((t) => t.poolIdx === i));
    if (idx === -1) return;
    const { g, rect, label } = toastDomRefs.current[idx];
    const w = Math.max(76, text.length * 7.4 + 20);
    rect.setAttribute('x', (-w / 2).toFixed(1));
    rect.setAttribute('width', w.toFixed(1));
    rect.setAttribute('fill', toastBg);
    rect.setAttribute('stroke', paletteRef.current.toastStroke);
    label.setAttribute('fill', toastFg);
    label.textContent = text;
    g.setAttribute('transform', `translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(0.75)`);
    g.setAttribute('opacity', '1');
    g.setAttribute('display', 'inline');
    eng.activeToasts.push({ poolIdx: idx, x, y, age: 0, duration: 0.88 });
  }, []);

  const spawnFloorWave = useCallback((x, y, w, h, rx, color = null) => {
    const eng = engineRef.current;
    const waveColor = color || paletteRef.current.floorWaveBurst;
    const idx = waveDomRefs.current.findIndex((el, i) => el && !eng.activeWaves.some((wv) => wv.poolIdx === i));
    if (idx === -1) return;
    const el = waveDomRefs.current[idx];
    el.setAttribute('stroke', waveColor);
    el.setAttribute('display', 'inline');
    eng.activeWaves.push({ poolIdx: idx, x, y, w, h, rx, age: 0, duration: 0.9 });
  }, []);

  const triggerNodeImpact = useCallback(
    (nodeId, portPt, rippleColor = null, toastText = null) => {
      const now = performance.now();
      const eng = engineRef.current;
      const rColor = rippleColor || paletteRef.current.rippleReq;
      let b = eng.nodeBounces.get(nodeId);
      if (!b) {
        b = { offset: 0, vel: 0, flash: 0, lastTrigger: 0, lastToast: 0 };
        eng.nodeBounces.set(nodeId, b);
      }
      if (now - b.lastTrigger > 75) {
        b.vel = 52;
        b.flash = 1.0;
        b.lastTrigger = now;
        if (portPt) {
          spawnRipple(portPt.x, portPt.y, rColor, nodeId === 'lb' ? 19 : 16);
        }
        if (toastText && now - b.lastToast > 560) {
          const srv = layoutRef.current.positionedServers.find((s) => s.id === nodeId);
          if (srv) {
            b.lastToast = now;
            spawnToast(srv.x, srv.y - srv.h / 2 - 22, toastText, paletteRef.current.toastOkBg, paletteRef.current.toastOkText);
          }
        }
      }
    },
    [spawnRipple, spawnToast]
  );

  const spawnPacket = useCallback(
    (routeIdx, type = 0, dir = 1, speedMult = 1.0, originClientIdx = 0, ignoreHeadway = false, targetSrv = -1, flags = 0, latencyMs = 0) => {
      const eng = engineRef.current;
      const route = layoutRef.current.routeTables[routeIdx];
      if (!eng || !route) return false;

      if (!ignoreHeadway) {
        const HEADWAY = 0.14;
        for (let i = 0; i < MAX_PACKETS; i++) {
          if (eng.pktActive[i] === 0) continue;
          if (eng.pktRoute[i] === routeIdx && eng.pktDir[i] === dir) {
            if (dir === 1 && eng.pktU[i] < HEADWAY) return false;
            if (dir === -1 && eng.pktU[i] > 1.0 - HEADWAY) return false;
          }
        }
      }

      let slot = -1;
      for (let i = 0; i < MAX_PACKETS; i++) {
        const idx = (eng.writeCursor + i) & (MAX_PACKETS - 1);
        if (eng.pktActive[idx] === 0) {
          slot = idx;
          eng.writeCursor = (idx + 1) & (MAX_PACKETS - 1);
          break;
        }
      }
      if (slot === -1) return false;

      eng.pktActive[slot] = 1;
      eng.pktRoute[slot] = routeIdx;
      eng.pktType[slot] = type;
      eng.pktDir[slot] = dir;
      eng.pktU[slot] = dir === 1 ? 0.024 : 0.976;
      eng.pktOrigin[slot] = originClientIdx;
      eng.pktTargetSrv[slot] = targetSrv;
      eng.pktFlags[slot] = flags;
      eng.pktLatencyMs[slot] = latencyMs;
      eng.pktSpeed[slot] = (290 * speedMult) / Math.max(route.totalLen, 1);

      const nClients = layoutRef.current.positionedClients.length;
      if (dir === 1 && routeIdx < nClients) {
        const c = layoutRef.current.positionedClients[routeIdx];
        if (c) {
          triggerNodeImpact(c.id, route.startPt, type === 3 ? '#ef4444' : '#f08c65');
          playDotIn(type === 2);
        }
      }
      return true;
    },
    [triggerNodeImpact]
  );

  const clearPackets = useCallback(() => {
    const eng = engineRef.current;
    eng.pktActive.fill(0);
    if (eng.liveQueue) eng.liveQueue.length = 0;
    packetDomRefs.current.forEach((el) => {
      if (el) el.setAttribute('display', 'none');
    });
  }, []);

  // =========================================================================
  // 6. INTERACTIVE TOPOLOGY & HUD HANDLERS
  // =========================================================================
  const handleAddClient = () => {
    if (clients.length >= 6) return;
    clearPackets();
    setClients((prev) => {
      const next = CLIENT_PRESETS[prev.length] || {
        id: `c-${Date.now()}`,
        name: `Client ${prev.length + 1}`,
        ip: `198.51.100.${10 + prev.length}`,
        region: 'US-Central',
        dashed: false,
        type: 'laptop'
      };
      return [...prev, next];
    });
  };

  const handleRemoveClient = () => {
    if (clients.length <= 1) return;
    clearPackets();
    setClients((prev) => prev.slice(0, -1));
  };

  const handleAddServer = () => {
    if (IS_LIVE_BACKEND) return;
    if (servers.length >= 5) return;
    clearPackets();
    setServers((prev) => {
      const idx = prev.length;
      const letter = SERVER_LETTERS[idx] || `${idx + 1}`;
      return [
        ...prev,
        {
          id: `srv-${letter.toLowerCase()}`,
          name: `Server ${letter}`,
          ip: `10.0.1.${40 + idx * 17}:8080`,
          cpu: 46 + (idx * 7) % 25,
          conn: 10 + idx * 2,
          healthy: true
        }
      ];
    });
  };

  const handleRemoveServer = () => {
    if (IS_LIVE_BACKEND) return;
    if (servers.length <= 1) return;
    clearPackets();
    setServers((prev) => prev.slice(0, -1));
  };

  const handleToggleServer = (srvIdx) => {
    const targetSrv = layoutRef.current.positionedServers[srvIdx];
    if (!targetSrv) return;
    const willBeHealthy = !targetSrv.healthy;
    if (IS_LIVE_BACKEND) {
      storeToggleServer(targetSrv.id);
    }

    setServers((prev) =>
      prev.map((s, i) =>
        i === srvIdx
          ? {
              ...s,
              healthy: willBeHealthy,
              cpu: willBeHealthy ? 48 + i * 7 : 0,
              conn: willBeHealthy ? 10 + i * 3 : 0
            }
          : s
      )
    );

    spawnFloorWave(
      targetSrv.x,
      targetSrv.y,
      targetSrv.w,
      targetSrv.h,
      13,
      willBeHealthy ? paletteRef.current.floorWaveOnline : paletteRef.current.floorWaveOffline
    );
    spawnToast(
      targetSrv.x,
      targetSrv.y - targetSrv.h / 2 - 22,
      willBeHealthy ? `${targetSrv.name.toUpperCase()} ONLINE` : 'FAILOVER • REROUTING',
      willBeHealthy ? paletteRef.current.toastOkBg : paletteRef.current.toastFailBg,
      willBeHealthy ? paletteRef.current.toastOkText : paletteRef.current.toastFailText
    );

    // Reroute any in-flight forward packets on the downed wire
    if (!willBeHealthy) {
      const eng = engineRef.current;
      const nClients = layoutRef.current.positionedClients.length;
      const deadRouteIdx = nClients + srvIdx;
      const healthyIndices = layoutRef.current.positionedServers
        .map((s, idx) => (s.healthy && idx !== srvIdx ? idx : -1))
        .filter((idx) => idx !== -1);

      for (let i = 0; i < MAX_PACKETS; i++) {
        if (eng.pktActive[i] && eng.pktRoute[i] === deadRouteIdx && eng.pktDir[i] === 1) {
          if (healthyIndices.length > 0) {
            const altIdx = healthyIndices[eng.pktOrigin[i] % healthyIndices.length];
            eng.pktRoute[i] = nClients + altIdx;
          } else {
            eng.pktActive[i] = 0;
          }
        }
      }
    }
  };

  const handleCycleAlgo = () => {
    const nextIdx = (algoIdx + 1) % ALGORITHMS.length;
    setAlgoIdx(nextIdx);
    const { LB } = layoutRef.current;
    spawnToast(LB.x, LB.y - LB.h / 2 - 24, `MODE: ${ALGORITHMS[nextIdx]}`, paletteRef.current.toastModeBg, paletteRef.current.toastModeText);
  };

  const handleBurstWave = () => {
    if (isPaused) setIsPaused(false);
    const { LB, clientRoutes } = layoutRef.current;
    spawnFloorWave(LB.x, LB.y, LB.w, LB.h, 14, paletteRef.current.floorWaveBurst);
    clientRoutes.forEach((cr, idx) => {
      spawnPacket(cr.routeIdx, cr.client.dashed ? 2 : 0, 1, 1.15, idx, true);
    });
    spawnToast(LB.x, LB.y - LB.h / 2 - 24, '⚡ BURST WAVE', paletteRef.current.toastModeBg, paletteRef.current.toastModeText);
  };

  // =========================================================================
  // 6b. BIDIRECTIONAL CONTROL BRIDGE (Exposes API for StudioRightPanel)
  // =========================================================================
  useEffect(() => {
    window.LoadBalancerVisualizer = { ...(window.LoadBalancerVisualizer || {}),
      addClient: handleAddClient,
      removeClient: handleRemoveClient,
      addServer: handleAddServer,
      removeServer: handleRemoveServer,
      toggleServer: handleToggleServer,
      setAlgorithm: (algo) => {
        const idx = ALGORITHMS.indexOf(algo);
        if (idx !== -1) setAlgoIdx(idx);
      },
      cycleAlgorithm: handleCycleAlgo,
      setRequestRate: (rps) => setTargetRPS(rps),
      triggerBurstWave: handleBurstWave,
      togglePause: () => setIsPaused((p) => !p),
      triggerRequest: (clientIdx = 0) => {
        const cr = layoutRef.current.clientRoutes[clientIdx] || layoutRef.current.clientRoutes[0];
        if (cr) spawnPacket(cr.routeIdx, cr.client.dashed ? 2 : 0, 1, 1.1, clientIdx, true);
      },
      getState: () => ({
        clients,
        servers,
        algorithm: ALGORITHMS[algoIdx],
        targetRps: targetRPS,
        isPaused,
        metrics: {
          dns: metrics.dns,
          lb: metrics.dispatch,
          server: metrics.server,
          throughput: targetRPS,
          totalRtt: metrics.rtt,
        }
      }),
      fitView: resetCamera,
    };

    window.dispatchEvent(
      new CustomEvent('lb-visualizer-state', {
        detail: {
          clients,
          servers,
          algorithm: ALGORITHMS[algoIdx],
          targetRps: targetRPS,
          isPaused,
          metrics: {
            dns: metrics.dns,
            lb: metrics.dispatch,
            server: metrics.server,
            throughput: targetRPS,
            totalRtt: metrics.rtt,
          }
        }
      })
    );
  }, [clients, servers, algoIdx, targetRPS, isPaused, metrics]);

  // =========================================================================
  // 7. VIEWPORT RESIZE, PAN & CURSOR-CENTERED ZOOM
  // =========================================================================
  useEffect(() => {
    const updateSize = () => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      setViewport({
        w: rect.width || window.innerWidth,
        h: rect.height || 740
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && stageRef.current) {
      ro = new ResizeObserver(updateSize);
      ro.observe(stageRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateSize);
      if (ro) ro.disconnect();
    };
  }, []);

  const baseScale = Math.min(viewport.w / 1520, viewport.h / 900);
  const effScale = baseScale * camera.zoom;
  const vbW = viewport.w / effScale;
  const vbH = viewport.h / effScale;
  const vbX = camera.cx - vbW / 2;
  const vbY = camera.cy - vbH / 2;

  const handleWheel = (e) => {
    if (e.deltaY > 0 && camera.zoom <= 1.001) {
      return;
    }
    e.preventDefault();
    const rect = stageRef.current ? stageRef.current.getBoundingClientRect() : { left: 0, top: 0 };
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = vbX + (mouseX / viewport.w) * vbW;
    const worldY = vbY + (mouseY / viewport.h) * vbH;
    const nextZoom = Math.min(3.5, Math.max(1.0, camera.zoom * Math.exp(-e.deltaY * 0.0014)));
    if (nextZoom <= 1.001) {
      setCamera({ cx: 760, cy: 455, zoom: 1.0 });
      return;
    }
    const nextEff = baseScale * nextZoom;
    const nextVbW = viewport.w / nextEff;
    const nextVbH = viewport.h / nextEff;

    setCamera({
      cx: worldX - (mouseX / viewport.w) * nextVbW + nextVbW / 2,
      cy: worldY - (mouseY / viewport.h) * nextVbH + nextVbH / 2,
      zoom: nextZoom
    });
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0 || camera.zoom <= 1.01) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startCX: camera.cx,
      startCY: camera.cy
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active) return;
      const scale = Math.min(viewport.w / 1520, viewport.h / 900) * camera.zoom;
      setCamera((prev) => ({
        ...prev,
        cx: dragRef.current.startCX - (e.clientX - dragRef.current.startX) / scale,
        cy: dragRef.current.startCY - (e.clientY - dragRef.current.startY) / scale
      }));
    };
    const onUp = () => {
      dragRef.current.active = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [viewport, camera.zoom]);

  const resetCamera = () => setCamera({ cx: 760, cy: 455, zoom: 1.0 });

  // =========================================================================
  // 8. MAIN 60-120FPS ANIMATION & DUPLEX COLLISION-AVOIDANCE LOOP
  // =========================================================================
  useEffect(() => {
    // Seed initial traffic on mount only if in dummy mode
    if (useSimulationStore.getState().clusterMode === 'dummy') {
      layoutRef.current.clientRoutes.forEach((cr, idx) => {
        spawnPacket(cr.routeIdx, cr.client.dashed ? 2 : 0, 1, 1.0, idx, true);
      });
    }

    let rafId;
    let lastTime = performance.now();

    const pickHealthyServerIdx = (clientIdx) => {
      const srvs = layoutRef.current.positionedServers;
      const healthy = [];
      for (let i = 0; i < srvs.length; i++) {
        if (srvs[i].healthy) healthy.push(i);
      }
      if (healthy.length === 0) return -1;

      const eng = engineRef.current;
      const algo = ALGORITHMS[stateRef.current.algoIdx];
      if (algo === 'LEAST CONN') {
        let best = healthy[0];
        for (let i = 1; i < healthy.length; i++) {
          if (srvs[healthy[i]].conn < srvs[best].conn) best = healthy[i];
        }
        return best;
      }
      if (algo === 'IP HASH') {
        return healthy[clientIdx % healthy.length];
      }
      const pick = healthy[eng.rrCounter % healthy.length];
      eng.rrCounter++;
      return pick;
    };

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);
      const rawDt = (now - lastTime) * 0.001;
      if (rawDt <= 0) return;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const { targetRPS: rps, isPaused: paused } = stateRef.current;
      const { positionedClients, positionedServers, routeTables, clientRoutes, serverRoutes } = layoutRef.current;
      const nClients = positionedClients.length;
      const eng = engineRef.current;

      if (!paused) {
        // 1. Update Hooke's Law Spring Bounces
        const stiffness = 430;
        const damping = 23;
        eng.nodeBounces.forEach((b, nodeId) => {
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

          if (nodeId === 'lb') {
            if (lbBounceRef.current) lbBounceRef.current.setAttribute('transform', `translate(0, ${b.offset.toFixed(2)})`);
            if (lbPulseRef.current) lbPulseRef.current.setAttribute('opacity', (b.flash * 0.65).toFixed(2));
          } else if (serverBounceRefs.current[nodeId]) {
            serverBounceRefs.current[nodeId].setAttribute('transform', `translate(0, ${b.offset.toFixed(2)})`);
            const leds = serverLedRefs.current[nodeId];
            const srvObj = positionedServers.find((s) => s.id === nodeId);
            if (leds && srvObj && srvObj.healthy) {
              leds.led1.setAttribute('fill', b.flash > 0.35 ? '#48b850' : '#23211e');
              leds.led2.setAttribute('fill', b.flash > 0.55 ? '#f08c65' : '#23211e');
            }
          } else if (clientBounceRefs.current[nodeId]) {
            clientBounceRefs.current[nodeId].setAttribute('transform', `translate(0, ${(b.offset * 0.55).toFixed(2)})`);
          }
        });

        // Fade LB Switching Arc
        if (eng.switchingArcFade > 0 && lbArcRef.current) {
          eng.switchingArcFade = Math.max(0, eng.switchingArcFade - dt);
          lbArcRef.current.setAttribute('opacity', (eng.switchingArcFade / 0.28).toFixed(2));
        }

        // Update Port Ripples
        for (let i = eng.activeRipples.length - 1; i >= 0; i--) {
          const rp = eng.activeRipples[i];
          rp.age += dt;
          const el = rippleDomRefs.current[rp.poolIdx];
          if (!el || rp.age >= rp.duration) {
            if (el) el.setAttribute('display', 'none');
            eng.activeRipples.splice(i, 1);
            continue;
          }
          const p = rp.age / rp.duration;
          const ease = 1 - Math.pow(1 - p, 3);
          const r = 4.5 + (rp.maxR - 4.5) * ease;
          el.setAttribute('r', r.toFixed(1));
          el.setAttribute('opacity', ((1 - p) * 0.8).toFixed(2));
        }

        // Update Floating Telemetry Toasts
        for (let i = eng.activeToasts.length - 1; i >= 0; i--) {
          const t = eng.activeToasts[i];
          t.age += dt;
          const obj = toastDomRefs.current[t.poolIdx];
          if (!obj || t.age >= t.duration) {
            if (obj) obj.g.setAttribute('display', 'none');
            eng.activeToasts.splice(i, 1);
            continue;
          }
          const p = t.age / t.duration;
          const dy = -25 * (1 - Math.pow(1 - p, 2));
          const sc = p < 0.18 ? 0.78 + (p / 0.18) * 0.22 : 1.0;
          const op = p > 0.65 ? (1 - p) / 0.35 : 1.0;
          obj.g.setAttribute('transform', `translate(${t.x.toFixed(1)}, ${(t.y + dy).toFixed(1)}) scale(${sc.toFixed(2)})`);
          obj.g.setAttribute('opacity', op.toFixed(2));
        }

        // Update Floor Pulse Waves
        for (let i = eng.activeWaves.length - 1; i >= 0; i--) {
          const wv = eng.activeWaves[i];
          wv.age += dt;
          const el = waveDomRefs.current[wv.poolIdx];
          if (!el || wv.age >= wv.duration) {
            if (el) el.setAttribute('display', 'none');
            eng.activeWaves.splice(i, 1);
            continue;
          }
          const p = wv.age / wv.duration;
          const ease = 1 - Math.pow(1 - p, 2.4);
          const expand = ease * 68;
          const curW = wv.w + expand * 2;
          const curH = wv.h + expand * 2;
          el.setAttribute('x', (wv.x - curW / 2).toFixed(1));
          el.setAttribute('y', (wv.y - curH / 2).toFixed(1));
          el.setAttribute('width', curW.toFixed(1));
          el.setAttribute('height', curH.toFixed(1));
          el.setAttribute('rx', (wv.rx + expand * 0.4).toFixed(1));
          el.setAttribute('opacity', ((1 - p) * 0.7).toFixed(2));
        }

        // 2. Emit Client Requests (Dummy mode only)
        const currentMode = useSimulationStore.getState().clusterMode;
        const speedMult = rps >= 1000 ? 1.45 : rps >= 180 ? 1.22 : 1.0;

        if (currentMode === 'dummy') {
          const visualEmitRate =
            rps <= 12 ? 3.2 : rps <= 45 ? 7.5 : rps <= 180 ? 14 : rps <= 1000 ? 22 : 30;

          eng.spawnAcc += dt * visualEmitRate;
          let attempts = 0;
          while (eng.spawnAcc >= 1.0 && attempts < nClients * 2 && nClients > 0) {
            eng.spawnAcc -= 1.0;
            attempts++;
            const cIdx = eng.clientCursor % nClients;
            eng.clientCursor++;
            const cr = clientRoutes[cIdx];
            if (cr) {
              spawnPacket(cr.routeIdx, cr.client.dashed ? 2 : 0, 1, speedMult, cIdx, false);
            }
          }
          if (eng.spawnAcc > 3) eng.spawnAcc = 0;
        } else {
          // Live Azure Mode: paced queue emission -> silky smooth evenly spaced dots, zero clumping
          eng.spawnAcc = 0;
          for (let c = 0; c < nClients; c++) {
            eng.clientCooldowns[c] = Math.max(0, eng.clientCooldowns[c] - dt);
          }
          const minGapSec = eng.liveQueue.length > 14 ? 0.065 : eng.liveQueue.length > 5 ? 0.095 : 0.12;
          let emitted = 0;
          while (eng.liveQueue.length > 0 && emitted < nClients && nClients > 0) {
            let picked = -1;
            for (let scan = 0; scan < nClients; scan++) {
              const cand = (eng.clientCursor + scan) % nClients;
              const cr = clientRoutes[cand];
              let laneClear = true;
              if (cr) {
                for (let k = 0; k < MAX_PACKETS; k++) {
                  if (eng.pktActive[k] && eng.pktRoute[k] === cr.routeIdx && eng.pktDir[k] === 1 && eng.pktU[k] < 0.14) {
                    laneClear = false;
                    break;
                  }
                }
              }
              if (eng.clientCooldowns[cand] <= 0 && cr && laneClear) {
                picked = cand;
                break;
              }
            }
            if (picked === -1) break;
            eng.clientCursor = (picked + 1) % nClients;
            const item = eng.liveQueue.shift();
            const cr = clientRoutes[picked];
            const flags = (item.directNoLb ? 1 : 0) | (!item.isSuccess ? 2 : 0);
            const pType = !item.isSuccess ? 3 : 0;
            spawnPacket(cr.routeIdx, pType, 1, 1.18, picked, false, item.sIdx, flags, item.latency || 0);
            eng.clientCooldowns[picked] = minGapSec;
            emitted++;
          }
        }

        // 3. Advance Active Packets Along LUTs
        for (let i = 0; i < MAX_PACKETS; i++) {
          if (eng.pktActive[i] === 0) continue;

          const dir = eng.pktDir[i];
          const uNext = eng.pktU[i] + dir * eng.pktSpeed[i] * dt;
          eng.pktU[i] = uNext;

          if (uNext >= 0.98 || uNext <= 0.02) {
            const rIdx = eng.pktRoute[i];
            const originC = eng.pktOrigin[i];
            const route = routeTables[rIdx];
            const tSrv = eng.pktTargetSrv[i];
            const flags = eng.pktFlags[i];
            const latMs = eng.pktLatencyMs[i];
            const isDirect = (flags & 1) !== 0;
            const isErr = (flags & 2) !== 0 || eng.pktType[i] === 3;
            eng.pktActive[i] = 0;

            // A) Client -> LB Input Port
            if (dir === 1 && rIdx < nClients) {
              const lbOfflineNow =
                IS_LIVE_BACKEND &&
                useSimulationStore.getState().clusterMode === 'live' &&
                !useSimulationStore.getState().lbOnline;

              if (isDirect && tSrv >= 0 && serverRoutes[tSrv]) {
                spawnPacket(serverRoutes[tSrv].routeIdx, isErr ? 3 : 0, 1, 1.2, originC, true, tSrv, flags, latMs);
              } else if (lbOfflineNow) {
                triggerNodeImpact('lb', route ? route.endPt : null, '#ef4444', '502 LB OFFLINE');
                if (clientRoutes[originC]) {
                  spawnPacket(clientRoutes[originC].routeIdx, 3, -1, 1.15, originC, true, tSrv, flags | 2, latMs);
                }
              } else {
                triggerNodeImpact('lb', route ? route.endPt : null, isErr ? '#ef4444' : paletteRef.current.rippleReq);
                let targetSrvIdx = -1;
                if (tSrv >= 0 && tSrv < positionedServers.length && (positionedServers[tSrv]?.healthy || isErr)) {
                  targetSrvIdx = tSrv;
                } else {
                  targetSrvIdx = pickHealthyServerIdx(originC);
                }
                if (targetSrvIdx !== -1 && serverRoutes[targetSrvIdx]) {
                  const sRouteObj = serverRoutes[targetSrvIdx];
                  if (route && lbArcRef.current) {
                    const { LB } = layoutRef.current;
                    lbArcRef.current.setAttribute(
                      'd',
                      `M ${route.endPt.x.toFixed(1)} ${(route.endPt.y + 8).toFixed(1)} Q ${LB.x.toFixed(1)} ${LB.y.toFixed(1)} ${sRouteObj.startPt.x.toFixed(1)} ${(sRouteObj.startPt.y - 8).toFixed(1)}`
                    );
                    lbArcRef.current.setAttribute('stroke', paletteRef.current.lbArc);
                    lbArcRef.current.setAttribute('opacity', '0.92');
                    eng.switchingArcFade = 0.28;
                  }
                  spawnPacket(sRouteObj.routeIdx, isErr ? 3 : 0, 1, 1.18, originC, true, targetSrvIdx, flags, latMs);
                } else if (clientRoutes[originC]) {
                  spawnPacket(clientRoutes[originC].routeIdx, 3, -1, 1.15, originC, true, -1, flags | 2, latMs);
                }
              }
            }
            // B) LB -> Backend Server Input Port
            else if (dir === 1 && rIdx >= nClients) {
              const srvIdx = rIdx - nClients;
              const srv = positionedServers[srvIdx];
              if (srv && srv.healthy && !isErr) {
                const msVal = Math.round(latMs || 0);
                const label = msVal > 0 ? `${isDirect ? 'DIRECT 200' : '200 OK'} · ${msVal}ms` : '200 OK';
                triggerNodeImpact(srv.id, route ? route.endPt : null, paletteRef.current.rippleReq, label);
                spawnPacket(rIdx, 1, -1, 1.18, originC, true, srvIdx, flags, latMs);
              } else if (srv) {
                triggerNodeImpact(srv.id, route ? route.endPt : null, '#ef4444', '503 CRASHED');
                spawnPacket(rIdx, 3, -1, 1.18, originC, true, srvIdx, flags | 2, latMs);
              }
            }
            // C) Backend Server -> LB Output Port
            else if (dir === -1 && rIdx >= nClients) {
              if (!isDirect) {
                triggerNodeImpact('lb', route ? route.startPt : null, isErr ? '#ef4444' : paletteRef.current.rippleRes);
              }
              const validClientIdx = originC < nClients ? originC : 0;
              if (clientRoutes[validClientIdx]) {
                spawnPacket(clientRoutes[validClientIdx].routeIdx, isErr ? 3 : 1, -1, 1.18, validClientIdx, true, tSrv, flags, latMs);
              }
            }
            // D) LB -> Originating Client Port
            else if (dir === -1 && rIdx < nClients) {
              const client = positionedClients[rIdx];
              if (client && route) {
                triggerNodeImpact(client.id, route.startPt, isErr ? '#ef4444' : paletteRef.current.rippleRes);
                playDotOut(isErr);
              }
            }
          }
        }

        // 4. Periodic Telemetry Update (Dummy simulation mode only — never overwrite Azure telemetry in live mode)
        if (currentMode === 'dummy') {
          eng.metricAcc += dt;
          if (eng.metricAcc >= 0.95) {
            eng.metricAcc = 0;
            const srvs = stateRef.current.servers;
            const healthyCount = srvs.filter((s) => s.healthy).length;
            const hDenom = healthyCount || 1;
            const loadShare = Math.round(
              (3 / hDenom) * (rps >= 1000 ? 22 : rps >= 180 ? 14 : rps >= 45 ? 6 : 0)
            );
            const connMult = rps >= 5000 ? 14 : rps >= 1000 ? 7 : rps >= 180 ? 3 : 1;

            setServers((prev) =>
              prev.map((s, idx) => {
                if (!s.healthy) return s;
                const baseCpu = 44 + ((idx * 11) % 26);
                const jitter = Math.floor(Math.random() * 7) - 3;
                const nextCpu = Math.min(98, Math.max(14, baseCpu + loadShare + jitter));
                const nextConn = Math.max(
                  4,
                  Math.round((10 + ((idx * 3) % 9)) * connMult * (3 / hDenom)) + Math.floor(Math.random() * 3)
                );
                return { ...s, cpu: nextCpu, conn: nextConn };
              })
            );

            const dns = 18;
            const dispatch = rps >= 1000 ? 31 : 24;
            const exec = healthyCount > 0 ? 42 + Math.round(loadShare * 0.8) : 0;
            setMetrics({
              dns,
              dispatch,
              server: exec,
              rtt: healthyCount > 0 ? dns + dispatch + exec : 0
            });
          }
        } else {
          eng.metricAcc = 0;
        }
      }

      // 5. Render Active Packets with Collision-Free Duplex Passing Lanes
      let renderedCount = 0;
      const PASS_WINDOW = 0.16;

      for (let i = 0; i < MAX_PACKETS && renderedCount < SVG_PACKET_POOL; i++) {
        if (eng.pktActive[i] === 0) continue;

        const rIdx = eng.pktRoute[i];
        const route = routeTables[rIdx];
        if (!route) continue;

        const u = eng.pktU[i];
        const dir = eng.pktDir[i];
        const sample = sampleRouteWithNormal(route, u);

        // Cosine-bell duplex passing offset when opposing packets pass on the same wire
        let maxAvoid = 0;
        for (let j = 0; j < MAX_PACKETS; j++) {
          if (eng.pktActive[j] === 0 || j === i) continue;
          if (eng.pktRoute[j] === rIdx && eng.pktDir[j] !== dir) {
            const dist = Math.abs(u - eng.pktU[j]);
            if (dist < PASS_WINDOW) {
              const bell = 0.5 * (1 + Math.cos(Math.PI * (dist / PASS_WINDOW)));
              if (bell > maxAvoid) maxAvoid = bell;
            }
          }
        }
        const lateralOffset = dir * maxAvoid * 6.8;

        const px = sample.x + sample.nx * lateralOffset;
        const py = sample.y + sample.ny * lateralOffset;

        let scale = 1.0;
        if (u < 0.10) {
          const t = Math.max(0, (u - 0.02) / 0.08);
          scale = 0.28 + 0.72 * (1 - Math.pow(1 - t, 2));
        } else if (u > 0.90) {
          const t = Math.max(0, (0.98 - u) / 0.08);
          scale = 0.28 + 0.72 * (1 - Math.pow(1 - t, 2));
        }

        const el = packetDomRefs.current[renderedCount++];
        if (!el) continue;

        el.setAttribute('cx', px.toFixed(2));
        el.setAttribute('cy', py.toFixed(2));
        el.setAttribute('r', (6.2 * scale).toFixed(2));

        const pType = eng.pktType[i];
        if (pType === 0) {
          el.setAttribute('fill', paletteRef.current.pktReqFill);
          el.setAttribute('stroke', paletteRef.current.pktReqStroke);
        } else if (pType === 1) {
          el.setAttribute('fill', paletteRef.current.pktResFill);
          el.setAttribute('stroke', paletteRef.current.pktResStroke);
        } else if (pType === 3) {
          el.setAttribute('fill', '#ef4444');
          el.setAttribute('stroke', '#7f1d1d');
        } else {
          el.setAttribute('fill', paletteRef.current.pktHandFill);
          el.setAttribute('stroke', paletteRef.current.pktHandStroke);
        }
        el.setAttribute('display', 'inline');
      }

      for (let i = renderedCount; i < SVG_PACKET_POOL; i++) {
        const el = packetDomRefs.current[i];
        if (el && el.getAttribute('display') !== 'none') {
          el.setAttribute('display', 'none');
        }
      }
    };

    const onLbPacketEvent = (e) => {
      const eng = engineRef.current;
      if (!eng) return;
      const { serverId, isSuccess, directNoLb, latency } = e.detail || {};
      const srvs = stateRef.current.servers;
      if (!srvs || srvs.length === 0) return;
      let targetIdx = srvs.findIndex((s, idx) =>
        s.id === serverId ||
        s.name === serverId ||
        s.host === serverId ||
        serverId === `server-${idx + 1}` ||
        serverId === `srv-${idx + 1}` ||
        (typeof serverId === 'string' && serverId.toLowerCase().includes(String.fromCharCode(97 + idx))) ||
        (typeof serverId === 'string' && serverId.endsWith(String(idx + 1)))
      );
      const sIdx = targetIdx >= 0 ? targetIdx : (eng.rrCounter % srvs.length);
      if (eng.liveQueue.length >= 12) {
        eng.liveQueue.shift();
      }
      eng.liveQueue.push({
        sIdx,
        isSuccess: isSuccess !== false,
        directNoLb: Boolean(directNoLb),
        latency: latency || 0
      });
    };
    window.addEventListener('lb-packet-event', onLbPacketEvent);

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('lb-packet-event', onLbPacketEvent);
    };
  }, [spawnPacket, triggerNodeImpact]);

  const healthyCount = servers.filter((s) => s.healthy).length;
  const totalNodes = clients.length + 1 + healthyCount;
  const algoFormatted = ALGORITHMS[algoIdx]
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

  return (
    <div
      className={`lb-iso-visualizer relative w-full h-[470px] sm:h-[580px] lg:h-[690px] overflow-hidden select-none ${isDark ? 'lb-theme-dark' : ''}`}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        background: isDark
          ? 'radial-gradient(circle at 50% 48%, #221f2b 0%, #16141c 68%, #0e0d12 100%)'
          : 'radial-gradient(circle at 50% 48%, #faf6ed 0%, #f6f1e6 72%, #ebe2d0 100%)',
        color: palette.pillText
      }}
    >
      {/* Inline Keyframes & Crisp Neo-Brutalist Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&family=JetBrains+Mono:wght@500;600;700;800&display=swap');
        @keyframes gearSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .gear-spin {
          transform-box: fill-box;
          transform-origin: center;
          animation: gearSpin 6.5s linear infinite;
        }
        .gear-paused {
          animation-play-state: paused;
        }

        /* Dark Mode Neo-Brutalist Overrides */
        .lb-iso-visualizer.lb-theme-dark {
          background: radial-gradient(circle at 50% 48%, #221f2b 0%, #16141c 68%, #0e0d12 100%);
          color: #f6f2ff;
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
          color: #c4b5fd;
          border-right-color: #463f57;
        }
        .lb-iso-visualizer.lb-theme-dark .rps-btn:hover {
          background: #2a2538;
          color: #ffffff;
        }
        .lb-iso-visualizer.lb-theme-dark .rps-btn.active {
          background: #a78bfa;
          color: #141218;
        }
      `}</style>

      {/* Unified Dot-Matrix Paper Grain Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[2] opacity-25"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(rgba(196, 181, 253, 0.11) 0.8px, transparent 0.8px)'
            : 'radial-gradient(rgba(115, 100, 78, 0.16) 0.8px, transparent 0.8px)',
          backgroundSize: '14px 14px'
        }}
      />

      {/* =====================================================================
          TOP HUD: METRICS & INTERACTIVE CONTROLS
         ===================================================================== */}
      <div className="absolute top-3.5 left-4 right-4 z-30 flex flex-wrap items-start justify-between gap-2.5 pointer-events-none">
        {/* Left: Live Telemetry Cards */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <MetricCard
            label="TRANSFERRED"
            value={
              IS_LIVE_BACKEND && storeClusterMode === 'live'
                ? (storeMetrics.failedRequests > 0
                    ? `${(storeMetrics.totalRequests || 0).toLocaleString()} (${storeMetrics.failedRequests} err)`
                    : `${(storeMetrics.totalRequests || 0).toLocaleString()} reqs`)
                : `${(storeMetrics.totalRequests || 0).toLocaleString()} reqs`
            }
            icon="globe"
            isDark={isDark}
          />
          <MetricCard
            label="LB DISPATCH"
            value={isLbOffline ? 'OFFLINE' : `${Math.round(storeMetrics.lbDispatch ?? metrics.dispatch)} ms · ${storeMetrics.activeConnectionsTotal ?? 0}c`}
            icon="route"
            isDark={isDark}
          />
          <MetricCard
            label="SERVER EXEC"
            value={isLbOffline ? 'PAUSED' : (healthyCount > 0 ? `${Math.round(storeMetrics.serverExec ?? metrics.server)} ms` : 'ERR 503')}
            icon="server"
            isDark={isDark}
          />
          <MetricCard
            label="THROUGHPUT"
            value={`${(isLbOffline ? 0 : (storeClusterMode === 'live' ? (storeMetrics.currentRps || 0) : targetRPS)).toLocaleString()} req/s`}
            icon="pulse"
            isDark={isDark}
          />
          <MetricCard
            label="TOTAL RTT"
            value={isLbOffline ? 'LB OFFLINE' : (healthyCount > 0 ? `${Math.round(storeMetrics.avgLatency || metrics.rtt)} ms` : 'NO NODES')}
            valueClass={!isLbOffline && healthyCount > 0 ? (isDark ? 'text-emerald-400' : 'text-[#217238]') : 'text-rose-500'}
            icon="clock"
            isDark={isDark}
          />
        </div>

        {/* Right: Topology Steppers, RPS Selector, Strategy & Legend */}
        {!IS_LIVE_BACKEND && (
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Devices Stepper */}
          <div className="inline-flex items-center bg-[#fdfbf7] border-2 border-[#23211e] rounded-[10px] overflow-hidden shadow-[0_2.5px_0_#23211e]">
            <span className="px-2.5 py-1.5 text-[11px] font-extrabold bg-[#f4eee1] border-r-[1.5px] border-[#23211e] inline-flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M2 20h20" />
              </svg>
              {clients.length} Device{clients.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleRemoveClient}
              disabled={clients.length <= 1}
              className="px-2.5 py-1 text-[13px] font-extrabold bg-[#fdfbf7] border-r-[1.5px] border-[#23211e] hover:bg-[#f3ce75] disabled:opacity-35 cursor-pointer"
              title="Remove Client Device"
            >
              −
            </button>
            <button
              onClick={handleAddClient}
              disabled={clients.length >= 6}
              className="px-2.5 py-1 text-[13px] font-extrabold bg-[#fdfbf7] hover:bg-[#f3ce75] disabled:opacity-35 cursor-pointer"
              title="Add Client Device"
            >
              +
            </button>
          </div>

          {/* Servers Stepper */}
          <div className="inline-flex items-center bg-[#fdfbf7] border-2 border-[#23211e] rounded-[10px] overflow-hidden shadow-[0_2.5px_0_#23211e]">
            <span className="px-2.5 py-1.5 text-[11px] font-extrabold bg-[#f4eee1] border-r-[1.5px] border-[#23211e] inline-flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <rect x="3" y="4" width="18" height="6" rx="1.5" />
                <rect x="3" y="14" width="18" height="6" rx="1.5" />
              </svg>
              {servers.length} Server{servers.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleRemoveServer}
              disabled={servers.length <= 1}
              className="px-2.5 py-1 text-[13px] font-extrabold bg-[#fdfbf7] border-r-[1.5px] border-[#23211e] hover:bg-[#f3ce75] disabled:opacity-35 cursor-pointer"
              title="Remove Backend Server"
            >
              −
            </button>
            <button
              onClick={handleAddServer}
              disabled={servers.length >= 5}
              className="px-2.5 py-1 text-[13px] font-extrabold bg-[#fdfbf7] hover:bg-[#f3ce75] disabled:opacity-35 cursor-pointer"
              title="Add Backend Server"
            >
              +
            </button>
          </div>

          {/* RPS Selector */}
          <div className="inline-flex bg-[#efe9dc] border-2 border-[#23211e] rounded-[10px] overflow-hidden shadow-[0_2.5px_0_#23211e]">
            {RPS_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => setTargetRPS(opt.value)}
                className={`px-2.5 py-1.5 text-[11px] cursor-pointer transition-colors ${
                  i < RPS_OPTIONS.length - 1 ? 'border-r-[1.5px] border-[#23211e]' : ''
                } ${
                  targetRPS === opt.value
                    ? 'bg-[#f3ce75] text-[#23211e] font-extrabold'
                    : 'text-[#4d473e] font-bold hover:bg-[#f9f3e3]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Algorithm Switcher */}
          <button
            onClick={handleCycleAlgo}
            className="bg-[#fdfbf7] hover:bg-[#fff7e4] active:translate-y-[1.5px] border-2 border-[#23211e] rounded-[10px] px-3 py-1.5 text-[11.5px] font-bold inline-flex items-center gap-1.5 shadow-[0_2.5px_0_#23211e] cursor-pointer transition-transform"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            <span>{algoFormatted}</span>
          </button>

          {/* Burst Wave */}
          <button
            onClick={handleBurstWave}
            className="bg-[#fde5d9] hover:bg-[#fbd5c2] active:translate-y-[1.5px] border-2 border-[#23211e] rounded-[10px] px-3 py-1.5 text-[11.5px] font-bold inline-flex items-center gap-1.5 shadow-[0_2.5px_0_#23211e] cursor-pointer transition-transform"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Burst Wave</span>
          </button>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused((p) => !p)}
            className={`${
              isPaused ? 'bg-[#f3ce75]' : 'bg-[#fdfbf7] hover:bg-[#fff7e4]'
            } active:translate-y-[1.5px] border-2 border-[#23211e] rounded-[10px] px-3 py-1.5 text-[11.5px] font-bold inline-flex items-center gap-1.5 shadow-[0_2.5px_0_#23211e] cursor-pointer transition-transform`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Top-Right Active Node Counter Pill */}
          <div className="hidden xl:inline-flex items-center gap-2 bg-[#fdfbf7] border-2 border-[#23211e] rounded-[10px] px-3 py-1.5 text-[11px] font-extrabold shadow-[0_2.5px_0_#23211e]">
            <span className="w-2 h-2 rounded-full bg-[#48b850] inline-block" />
            <span>NODES: {totalNodes}</span>
          </div>
        </div>
        )}
      </div>

      {/* =====================================================================
          UNIFIED VECTOR BLUEPRINT STAGE (100% SEAMLESS PARCHMENT CANVAS)
         ===================================================================== */}
      <div
        ref={stageRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none z-[5]"
      >
        <svg
          viewBox={`${vbX.toFixed(2)} ${vbY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}`}
          className="w-full h-full block overflow-visible"
          style={{ shapeRendering: 'geometricPrecision', textRendering: 'geometricPrecision' }}
        >
          <defs>
            {/* Unified Seamless Blueprint Grid */}
            <pattern id="minor-grid-2d" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke={palette.gridLine} strokeWidth="1.15" />
            </pattern>
            <pattern id="major-grid-2d" width="180" height="180" patternUnits="userSpaceOnUse">
              <rect width="180" height="180" fill="url(#minor-grid-2d)" />
              <path d="M 180 0 L 0 0 0 180" fill="none" stroke={isDark ? '#383244' : '#d8cfbb'} strokeWidth="1.4" />
            </pattern>

            {/* Neo-Brutalist Card Gradients */}
            <linearGradient id="lb-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.lbTop0} />
              <stop offset="100%" stopColor={palette.lbTop1} />
            </linearGradient>

            <linearGradient id="srv-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.srvTop0} />
              <stop offset="100%" stopColor={palette.srvTop1} />
            </linearGradient>

            <linearGradient id="srv-off-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.srvOffTop0} />
              <stop offset="100%" stopColor={palette.srvOffTop1} />
            </linearGradient>

            <linearGradient id="client-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? palette.padTop0 : '#fdfbf7'} />
              <stop offset="100%" stopColor={isDark ? palette.padTop1 : '#f2ece0'} />
            </linearGradient>
          </defs>

          {/* 1. Infinite Seamless Blueprint Grid Layer */}
          <g>
            <rect x="-4000" y="-4000" width="9500" height="9500" fill="url(#major-grid-2d)" />
            {/* Architectural Corner Registration Marks */}
            {[
              [140, 110],
              [1380, 110],
              [140, 810],
              [1380, 810]
            ].map(([mx, my], i) => (
              <path
                key={i}
                d={`M ${mx} ${my - 8} V ${my + 8} M ${mx - 8} ${my} H ${mx + 8}`}
                stroke={isDark ? '#575063' : '#b8af9e'}
                strokeWidth="1.4"
              />
            ))}

            {/* Floor Pulse Wave Pool */}
            {Array.from({ length: SVG_WAVE_POOL }).map((_, i) => (
              <rect
                key={i}
                ref={(el) => (waveDomRefs.current[i] = el)}
                fill="none"
                stroke={palette.floorWaveBurst}
                strokeWidth="2.6"
                display="none"
              />
            ))}
          </g>

          {/* 2. Non-Crossing Planar Manifold Wires & Ports Layer */}
          <g>
            {/* Client -> LB Core Wires */}
            {layout.clientRoutes.map(({ route, client, startPt, endPt }) => {
              const strokeCol = client.dashed ? palette.wireDashed : palette.wireActive;
              return (
                <g key={client.id}>
                  <path
                    d={route.svgPath}
                    fill="none"
                    stroke={strokeCol}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={client.dashed ? '7 6' : undefined}
                  />
                  {/* Start Port Dock */}
                  <circle cx={startPt.x} cy={startPt.y} r="4.8" fill={palette.portRingFill} stroke={strokeCol} strokeWidth="2.1" />
                  <path
                    d="M 0 0 L -11 -5 L -8.4 0 L -11 5 Z"
                    fill={strokeCol}
                    transform={`translate(${startPt.x}, ${startPt.y}) rotate(-90)`}
                  />
                  {/* End Port Dock at LB */}
                  <circle cx={endPt.x} cy={endPt.y} r="4.8" fill={palette.portRingFill} stroke={strokeCol} strokeWidth="2.1" />
                  <path
                    d="M 0 0 L -11 -5 L -8.4 0 L -11 5 Z"
                    fill={strokeCol}
                    transform={`translate(${endPt.x}, ${endPt.y}) rotate(90)`}
                  />
                </g>
              );
            })}

            {/* LB Core -> Backend Server Wires */}
            {layout.serverRoutes.map(({ route, server, startPt, endPt }) => {
              const strokeCol = server.healthy ? palette.wireActive : palette.wireOffline;
              return (
                <g key={server.id}>
                  <path
                    d={route.svgPath}
                    fill="none"
                    stroke={strokeCol}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={server.healthy ? undefined : '7 6'}
                  />
                  {/* Start Port Dock at LB */}
                  <circle cx={startPt.x} cy={startPt.y} r="4.8" fill={palette.portRingFill} stroke={strokeCol} strokeWidth="2.1" />
                  <path
                    d="M 0 0 L -11 -5 L -8.4 0 L -11 5 Z"
                    fill={strokeCol}
                    transform={`translate(${startPt.x}, ${startPt.y}) rotate(90)`}
                  />
                  {/* End Port Dock at Server */}
                  <circle cx={endPt.x} cy={endPt.y} r="4.8" fill={palette.portRingFill} stroke={strokeCol} strokeWidth="2.1" />
                  <path
                    d="M 0 0 L -11 -5 L -8.4 0 L -11 5 Z"
                    fill={strokeCol}
                    transform={`translate(${endPt.x}, ${endPt.y}) rotate(90)`}
                  />
                </g>
              );
            })}
          </g>

          {/* 3. Port Shockwave Ripples Pool */}
          <g>
            {Array.from({ length: SVG_RIPPLE_POOL }).map((_, i) => (
              <circle
                key={i}
                ref={(el) => (rippleDomRefs.current[i] = el)}
                cx="0"
                cy="0"
                r="5"
                fill="none"
                stroke="#f08c65"
                strokeWidth="2.2"
                display="none"
              />
            ))}
          </g>

          {/* 4. Duplex Collision-Free Packets Pool */}
          <g>
            {Array.from({ length: SVG_PACKET_POOL }).map((_, i) => (
              <circle
                key={i}
                ref={(el) => (packetDomRefs.current[i] = el)}
                cx="0"
                cy="0"
                r="6.2"
                fill="#f08c65"
                stroke="#23211e"
                strokeWidth="2.2"
                display="none"
              />
            ))}
          </g>

          {/* 5. Top Row: Neo-Brutalist 2.5D-Beveled Client Nodes */}
          <g>
            {layout.positionedClients.map((c, idx) => (
              <g
                key={c.id}
                transform={`translate(${c.x - c.w / 2}, ${c.y - c.h / 2})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectNode) onSelectNode({ type: "client", id: c.id, data: c });
                  const cr = layout.clientRoutes[idx];
                  if (cr) spawnPacket(cr.routeIdx, c.dashed ? 2 : 0, 1, 1.05, idx, true);
                }}
              >
                <g ref={(el) => (clientBounceRefs.current[c.id] = el)}>
                  {/* Hard Neo-Brutalist Offset Shadow */}
                  <rect x="3.5" y="4.5" width={c.w} height={c.h} rx="12" fill={palette.pillHardShadow} />
                  {/* Main Card Body */}
                  <rect
                    x="0"
                    y="0"
                    width={c.w}
                    height={c.h}
                    rx="12"
                    fill="url(#client-top-grad)"
                    stroke={palette.padStroke}
                    strokeWidth="2.3"
                  />
                  {/* White Top Bevel Highlight */}
                  <path
                    d={`M 12 2.4 H ${c.w - 12}`}
                    stroke={palette.padBevel}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Device Glyph */}
                  <g transform="translate(24, 24)">
                    {c.type === 'mobile' ? (
                      <>
                        <rect x="-5.5" y="-8.5" width="11" height="17" rx="2.2" fill={palette.portRingFill} stroke={palette.padStroke} strokeWidth="1.9" />
                        <circle cx="0" cy="5.2" r="1.1" fill={palette.padStroke} />
                      </>
                    ) : c.type === 'api' || c.type === 'edge' ? (
                      <>
                        <rect x="-7.5" y="-6.5" width="15" height="13" rx="2.8" fill="#f3ce75" stroke={palette.padStroke} strokeWidth="1.9" />
                        <path d="M -3.2 0 H 3.2 M 0 -3.2 V 3.2" stroke={palette.padStroke} strokeWidth="1.7" strokeLinecap="round" />
                      </>
                    ) : (
                      <>
                        <rect x="-7.5" y="-6.5" width="15" height="10" rx="1.8" fill="#cec2f2" stroke={palette.padStroke} strokeWidth="1.9" />
                        <path d="M -9.5 5.5 H 9.5" stroke={palette.padStroke} strokeWidth="2.1" strokeLinecap="round" />
                      </>
                    )}
                  </g>

                  {/* Client Title */}
                  <text
                    x="40"
                    y="28.5"
                    fontFamily="'Inter', sans-serif"
                    fontSize="13.5"
                    fontWeight="800"
                    fill={palette.pillText}
                  >
                    {c.name}
                  </text>

                  {/* IP & Region Subtitle */}
                  <text
                    x={c.w / 2}
                    y="53"
                    textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace"
                    fontSize="10.5"
                    fontWeight="600"
                    fill={isDark ? '#a99fc2' : '#6b6356'}
                  >
                    {c.ip} · {c.region}
                  </text>
                </g>
              </g>
            ))}
          </g>

          {/* 6. Center Node: Golden-Amber Load Balancer Core */}
          <g
            transform={`translate(${layout.LB.x - layout.LB.w / 2}, ${layout.LB.y - layout.LB.h / 2})`}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectNode) onSelectNode({ type: "lb", id: "load-balancer" });
              handleCycleAlgo();
            }}
          >
            <g ref={lbBounceRef}>
              {/* 2.5D Extruded Golden Amber Bottom Shadow Block (or gray when LB offline) */}
              <rect
                x="4.5"
                y="6.5"
                width={layout.LB.w}
                height={layout.LB.h}
                rx="14"
                fill={isLbOffline ? palette.srvOffWall50 : palette.lbWall48}
                stroke={isLbOffline ? palette.srvOffStroke : palette.lbStroke}
                strokeWidth="2.6"
              />
              {/* Top Golden Amber Surface */}
              <rect
                x="0"
                y="0"
                width={layout.LB.w}
                height={layout.LB.h}
                rx="14"
                fill={isLbOffline ? 'url(#srv-off-grad)' : 'url(#lb-top-grad)'}
                stroke={isLbOffline ? palette.srvOffStroke : palette.lbStroke}
                strokeWidth="2.6"
              />
              {/* Crisp White Bevel Highlight */}
              <path
                d={`M 14 2.6 H ${layout.LB.w - 14}`}
                stroke={palette.lbBevel}
                strokeWidth="2.8"
                strokeLinecap="round"
              />

              {/* Dispatch Halo Ring */}
              <rect
                ref={lbPulseRef}
                x="5"
                y="5"
                width={layout.LB.w - 10}
                height={layout.LB.h - 10}
                rx="10"
                fill="none"
                stroke={palette.lbHalo}
                strokeWidth="2.2"
                strokeDasharray="6 5"
                opacity="0"
              />

              {/* Globe Icon */}
              <g transform="translate(38, 37)">
                <circle cx="0" cy="0" r="14.5" fill={palette.portRingFill} stroke={isLbOffline ? '#6e665c' : palette.lbIcon} strokeWidth="2.3" />
                <ellipse cx="0" cy="0" rx="6.8" ry="14.5" fill="none" stroke={isLbOffline ? '#6e665c' : palette.lbIcon} strokeWidth="2.1" />
                <line x1="-14" y1="0" x2="14" y2="0" stroke={isLbOffline ? '#6e665c' : palette.lbIcon} strokeWidth="2.1" />
              </g>

              {/* Title & VIP */}
              <text
                x={layout.LB.w / 2 + 12}
                y="34"
                textAnchor="middle"
                fontFamily="'Inter', sans-serif"
                fontSize="16.5"
                fontWeight="800"
                fill={isLbOffline ? palette.srvOffTitle : palette.lbTitle}
              >
                Load Balancer Core
              </text>
              <text
                x={layout.LB.w / 2 + 12}
                y="54"
                textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="11.5"
                fontWeight="700"
                fill={isLbOffline ? palette.pillOfflineText : palette.lbSubtitle}
              >
                {isLbOffline ? `GATEWAY OFFLINE · ${getGatewayHost()}` : `Pub: ${getGatewayHost()} · Priv: 172.16.0.4`}
              </text>

              {/* Divider & Junction Node */}
              <line x1="14" y1="73" x2={layout.LB.w - 14} y2="73" stroke={isLbOffline ? palette.srvOffStroke : palette.lbStroke} strokeWidth="1.9" />
              <circle cx={layout.LB.w / 2} cy="73" r="4.6" fill={isLbOffline ? '#9e9687' : palette.rippleReq} stroke={isLbOffline ? palette.srvOffStroke : palette.lbStroke} strokeWidth="2" />

              {/* Active Algorithm Pill */}
              <rect
                x={layout.LB.w / 2 - 98}
                y="86"
                width="196"
                height="33"
                rx="8"
                fill={isLbOffline ? palette.pillOfflineBg : palette.pillBg}
                stroke={palette.pillBorder}
                strokeWidth="2.1"
              />
              <text
                x={layout.LB.w / 2}
                y="107"
                textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="12"
                fontWeight="800"
                letterSpacing="0.06em"
                fill={isLbOffline ? palette.pillOfflineText : palette.pillText}
              >
                [ {isLbOffline ? 'LB OFFLINE' : ALGORITHMS[algoIdx]} ]
              </text>
            </g>
          </g>

          {/* 7. Bottom Row: Periwinkle-Blue Backend Server Nodes */}
          <g>
            {layout.positionedServers.map((s, idx) => {
              const barW = s.w - 70;
              const fillW = s.healthy ? Math.max(4, (barW * s.cpu) / 100) : 0;
              const barColor = s.cpu > 78 ? '#e36652' : s.cpu > 62 ? '#eba444' : '#6ec472';

              return (
                <g
                  key={s.id}
                  transform={`translate(${s.x - s.w / 2}, ${s.y - s.h / 2})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectNode) onSelectNode({ type: "server", id: s.id, data: s });
                    handleToggleServer(idx);
                  }}
                >
                  <g ref={(el) => (serverBounceRefs.current[s.id] = el)}>
                    {/* 2.5D Extruded Shadow Wall */}
                    <rect
                      x="4"
                      y="6.5"
                      width={s.w}
                      height={s.h}
                      rx="13"
                      fill={s.healthy ? palette.srvWall48 : palette.srvOffWall50}
                      stroke={s.healthy ? palette.srvStroke : palette.srvOffStroke}
                      strokeWidth="2.5"
                    />
                    {/* Top Surface */}
                    <rect
                      x="0"
                      y="0"
                      width={s.w}
                      height={s.h}
                      rx="13"
                      fill={s.healthy ? 'url(#srv-top-grad)' : 'url(#srv-off-grad)'}
                      stroke={s.healthy ? palette.srvStroke : palette.srvOffStroke}
                      strokeWidth="2.5"
                    />
                    {/* White Top Bevel Highlight */}
                    <path
                      d={`M 14 2.5 H ${s.w - 14}`}
                      stroke={palette.srvBevel}
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />

                    {/* Stacked Server Rack Icon with Live Flashing LEDs */}
                    <g transform="translate(29, 33)">
                      <rect x="-15" y="-13" width="30" height="10.5" rx="2.5" fill={s.healthy ? palette.srvRackFill : palette.srvOffRackFill} stroke={s.healthy ? palette.srvRackStroke : palette.srvOffRackStroke} strokeWidth="2.1" />
                      <line x1="-9" y1="-7.7" x2="1" y2="-7.7" stroke={s.healthy ? palette.srvRackStroke : palette.srvOffRackStroke} strokeWidth="2.1" strokeLinecap="round" />
                      <circle
                        ref={(el) => {
                          if (!serverLedRefs.current[s.id]) serverLedRefs.current[s.id] = {};
                          serverLedRefs.current[s.id].led1 = el;
                        }}
                        cx="8.5"
                        cy="-7.7"
                        r="2.2"
                        fill={s.healthy ? palette.srvLedIdle : palette.srvLedOffline}
                      />

                      <rect x="-15" y="1.5" width="30" height="10.5" rx="2.5" fill={s.healthy ? palette.srvRackFill : palette.srvOffRackFill} stroke={s.healthy ? palette.srvRackStroke : palette.srvOffRackStroke} strokeWidth="2.1" />
                      <line x1="-9" y1="6.7" x2="1" y2="6.7" stroke={s.healthy ? palette.srvRackStroke : palette.srvOffRackStroke} strokeWidth="2.1" strokeLinecap="round" />
                      <circle
                        ref={(el) => {
                          if (!serverLedRefs.current[s.id]) serverLedRefs.current[s.id] = {};
                          serverLedRefs.current[s.id].led2 = el;
                        }}
                        cx="8.5"
                        cy="6.7"
                        r="2.2"
                        fill={s.healthy ? palette.srvLedIdle : palette.srvLedOffline}
                      />
                    </g>

                    {/* Server Name & IP */}
                    <text
                      x="52"
                      y="30"
                      fontFamily="'Inter', sans-serif"
                      fontSize="15"
                      fontWeight="800"
                      fill={s.healthy ? palette.srvTitle : palette.srvOffTitle}
                    >
                      {s.name}
                    </text>
                    <text
                      x="52"
                      y="44"
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize="9.5"
                      fontWeight="600"
                      fill={isDark ? '#60a5fa' : '#2563eb'}
                    >
                      Pub: {s.publicIp || s.ip}
                    </text>
                    <text
                      x="52"
                      y="56"
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize="9"
                      fontWeight="500"
                      fill={isDark ? '#34d399' : '#059669'}
                    >
                      Priv: {s.privateIp || '10.0.1.10'}
                    </text>

                    {/* ON / OFF Interactive Toggle Pill */}
                    <rect
                      x={s.w - 49}
                      y="16"
                      width="37"
                      height="20"
                      rx="10"
                      fill={s.healthy ? palette.pillToggleOn : palette.pillToggleOff}
                      stroke={s.healthy ? palette.srvStroke : palette.srvOffStroke}
                      strokeWidth="2"
                    />
                    <text
                      x={s.w - 30.5}
                      y="29.5"
                      textAnchor="middle"
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize="9.5"
                      fontWeight="800"
                      fill="#23211e"
                    >
                      {s.healthy ? 'ON' : 'OFF'}
                    </text>

                    {/* Inner Telemetry Box */}
                    <rect
                      x="12"
                      y="63"
                      width={s.w - 24}
                      height="67"
                      rx="9"
                      fill={s.healthy ? palette.pillBg : palette.pillOfflineBg}
                      stroke={s.healthy ? palette.srvStroke : palette.srvOffStroke}
                      strokeWidth="2.1"
                    />

                    {/* Spinning Gear Icon */}
                    <g transform="translate(29, 83)">
                      <path
                        className={`gear-spin ${!s.healthy || isPaused ? 'gear-paused' : ''}`}
                        d="M -2 -7.2 L 2 -7.2 L 2.6 -5.0 L 4.6 -4.0 L 6.6 -5.0 L 8.2 -2.4 L 6.4 -0.8 L 6.4 0.8 L 8.2 2.4 L 6.6 5.0 L 4.6 4.0 L 2.6 5.0 L 2 7.2 L -2 7.2 L -2.6 5.0 L -4.6 4.0 L -6.6 5.0 L -8.2 2.4 L -6.4 0.8 L -6.4 -0.8 L -8.2 -2.4 L -6.6 -5.0 L -4.6 -4.0 L -2.6 -5.0 Z"
                        fill={palette.pillGear}
                      />
                      <circle cx="0" cy="0" r="2.5" fill={palette.pillBg} />
                    </g>

                    {/* CPU Progress Bar */}
                    <rect
                      x="46"
                      y="78"
                      width={barW}
                      height="10"
                      rx="5"
                      fill="#e6dfd1"
                      stroke="#23211e"
                      strokeWidth="1.5"
                    />
                    {s.healthy && (
                      <rect
                        x="47"
                        y="79"
                        width={fillW}
                        height="8"
                        rx="4"
                        fill={barColor}
                      />
                    )}

                    {/* CPU & Connections Telemetry Readout */}
                    <text
                      x="22"
                      y="115"
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize="11"
                      fontWeight="800"
                      fill={s.healthy ? '#23211e' : '#94291b'}
                    >
                      {s.healthy ? `CPU ${s.cpu}% • ${s.totalRequests || 0} reqs` : (s.status === 'failed' ? 'CRASHED • FAILOVER ACTIVE' : 'OFFLINE • FAILOVER ACTIVE')}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* 8. Load Balancer Internal Switching Arc & Floating Telemetry Toasts */}
          <g>
            <path
              ref={lbArcRef}
              d=""
              fill="none"
              stroke="#f08c65"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeDasharray="5 4"
              opacity="0"
            />

            {Array.from({ length: SVG_TOAST_POOL }).map((_, i) => (
              <g
                key={i}
                ref={(el) => {
                  if (el) {
                    toastDomRefs.current[i] = {
                      g: el,
                      rect: el.querySelector('rect'),
                      label: el.querySelector('text')
                    };
                  }
                }}
                display="none"
              >
                <rect
                  x="-40"
                  y="-11"
                  width="80"
                  height="22"
                  rx="11"
                  fill="#e9f7ea"
                  stroke="#23211e"
                  strokeWidth="1.9"
                />
                <text
                  x="0"
                  y="3.8"
                  textAnchor="middle"
                  fill="#1d682d"
                  fontFamily="'JetBrains Mono', monospace"
                  fontSize="10"
                  fontWeight="800"
                />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* =====================================================================
          BOTTOM-LEFT LEGEND & INTERACTION HINT
         ===================================================================== */}
      <div className="absolute left-4 bottom-3.5 z-25 flex flex-wrap items-center gap-4 text-[12px] font-semibold text-[#665f54] dark:text-[#a99fc2] pointer-events-none">
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-full bg-[#f08c65] border-2 border-[#23211e] dark:border-[#766b8c] inline-block" />
          request
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-full bg-[#78c67a] border-2 border-[#23211e] dark:border-[#766b8c] inline-block" />
          response
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-full bg-[#f6f1e6] border-2 border-[#4f9d52] inline-block" />
          handshake
        </span>
        <span className="hidden md:inline-block text-[11px] text-[#7c7365] dark:text-[#c4b5fd] bg-[#fdfbf7]/85 dark:bg-[#262230]/85 px-2.5 py-0.5 rounded-md border border-[#d6cebe] dark:border-[#463f57]">
          Click Client to fire • Click LB Core to switch strategy • Click Server for failover
        </span>
      </div>

      {/* =====================================================================
          BOTTOM-RIGHT ZOOM & FIT CONTROLS
         ===================================================================== */}
      <div className="absolute right-4 bottom-3.5 z-25 flex items-center gap-2 pointer-events-auto">
        <div className="inline-flex items-center bg-[#fdfbf7] dark:bg-[#262230] border-2 border-[#23211e] dark:border-[#766b8c] rounded-[10px] shadow-[0_2.5px_0_#23211e] dark:shadow-[0_2.5px_0_#09080d] overflow-hidden">
          <button
            onClick={() =>
              setCamera((c) => {
                const nextZ = Math.max(1.0, c.zoom / 1.22);
                return nextZ <= 1.001 ? { cx: 760, cy: 455, zoom: 1.0 } : { ...c, zoom: nextZ };
              })
            }
            disabled={camera.zoom <= 1.001}
            className="px-2.5 py-1 text-[12px] font-extrabold hover:bg-[#f5ecd7] dark:hover:bg-[#332d40] text-[#23211e] dark:text-[#f6f2ff] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            −
          </button>
          <div
            onClick={resetCamera}
            className="px-2.5 py-1 text-[11px] font-bold border-x-[1.5px] border-[#23211e] dark:border-[#766b8c] min-w-[54px] text-center tabular-nums text-[#23211e] dark:text-[#f6f2ff] cursor-pointer"
            title="Click to Reset 100% Fit"
          >
            {Math.round(camera.zoom * 100)}%
          </div>
          <button
            onClick={() => setCamera((c) => ({ ...c, zoom: Math.min(3.5, c.zoom * 1.22) }))}
            disabled={camera.zoom >= 3.49}
            className="px-2.5 py-1 text-[12px] font-extrabold hover:bg-[#f5ecd7] dark:hover:bg-[#332d40] text-[#23211e] dark:text-[#f6f2ff] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom In"
          >
            +
          </button>
        </div>
        <button
          onClick={resetCamera}
          className="neo-btn bg-[#fdfbf7] hover:bg-[#fff7e4] active:translate-y-[1.5px] border-2 border-[#23211e] rounded-[10px] px-3 py-1 text-[11px] font-bold shadow-[0_2.5px_0_#23211e] cursor-pointer transition-transform"
        >
          Fit View
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 4. REUSABLE TOP TELEMETRY CARD SUBCOMPONENT
// =========================================================================
function MetricCard({ label, value, valueClass = 'text-[#23211e]', icon, isDark = false }) {
  return (
    <div className="metric-card bg-[#fdfbf7]/95 border-[1.8px] border-[#23211e] rounded-[10px] px-3 py-1.5 min-w-[108px] shadow-[0_2px_0_#23211e,0_3px_8px_rgba(35,33,30,0.06)] backdrop-blur-sm">
      <div className="metric-card__header flex items-center gap-1.5 text-[9.5px] font-extrabold text-[#787063] tracking-wider uppercase mb-0.5">
        {icon === 'globe' && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
        )}
        {icon === 'route' && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="18" r="3" />
            <path d="M8.5 8.5l7 7" />
          </svg>
        )}
        {icon === 'server' && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
            <rect x="3" y="4" width="18" height="6" rx="1.5" />
            <rect x="3" y="14" width="18" height="6" rx="1.5" />
          </svg>
        )}
        {icon === 'pulse' && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        )}
        {icon === 'clock' && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 1.5M9 2h6" />
          </svg>
        )}
        <span>{label}</span>
      </div>
      <div className={`metric-card__value text-[15px] font-extrabold tracking-tight tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}














