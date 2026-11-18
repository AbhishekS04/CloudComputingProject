import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

/**
 * Visualizer2D
 * High-fidelity 2D Schematic Load Balancer Visualizer matching the exact
 * 1440x820 engineering blueprint architecture:
 * - 4-stage packet trajectory engine (client-to-lb, lb-to-server, server-to-lb, lb-to-client)
 * - Smooth orthogonal bus wiring with precision quadratic bezier junctions
 * - Interactive node toggling (Server failover, LB algorithm cycling)
 * - High-speed traffic simulation (1x, 4x, 12x, ⚡ Burst)
 * - Full Pan & Zoom support with Reset View
 * - Synchronized with simulation store and onSelectNode
 */
export default function Visualizer2D({ onSelectNode, selectedNode }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);

  // HUD state
  const [rateMultiplier, setRateMultiplier] = useState(1);
  const [algoIndex, setAlgoIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hudRps, setHudRps] = useState(24);
  const [hudRtt, setHudRtt] = useState(84);

  // Refs for animation mutable state
  const stateRef = useRef({
    rateMultiplier: 1,
    algoIndex: 0,
    isPaused: false,
    rrPointer: 0,
    panX: 0,
    panY: 0,
    zoom: 1,
    dragging: false,
    startX: 0,
    startY: 0
  });

  const ALGOS = ['ROUND ROBIN', 'LEAST CONN', 'WEIGHTED'];

  const CLIENTS = [
    { id: 'c1', name: 'Web Client 1', ip: '198.51.100.4',  region: 'NA-East',    x: 245,  y: 120, w: 138, h: 64, dashed: true,  weight: 1 },
    { id: 'c2', name: 'Mobile App',   ip: '203.0.113.19',  region: 'EU-Central', x: 475,  y: 120, w: 138, h: 64, dashed: true,  weight: 1 },
    { id: 'c3', name: 'Web Client 2', ip: '198.51.100.77', region: 'NA-West',    x: 720,  y: 120, w: 138, h: 64, dashed: false, weight: 1 },
    { id: 'c4', name: 'API Consumer', ip: '192.0.2.145',   region: 'AP-South',   x: 965,  y: 120, w: 138, h: 64, dashed: true,  weight: 1 },
    { id: 'c5', name: 'Edge Worker',  ip: '203.0.113.88',  region: 'SA-East',    x: 1195, y: 120, w: 138, h: 64, dashed: true,  weight: 1 }
  ];

  const LB = {
    x: 720,
    y: 355,
    w: 268,
    h: 112,
    vip: '10.0.0.1:443'
  };

  const SERVERS_INIT = [
    { id: 's1', name: 'Server A', ip: '10.0.1.14:8080', x: 435,  y: 665, w: 176, h: 122, cpu: 63, conn: 12, rtt: 92, status: 'healthy', color: '#1c1917' },
    { id: 's2', name: 'Server B', ip: '10.0.1.27:8080', x: 720,  y: 665, w: 176, h: 122, cpu: 68, conn: 16, rtt: 95, status: 'healthy', color: '#f59e0b' },
    { id: 's3', name: 'Server C', ip: '10.0.1.88:8080', x: 1005, y: 665, w: 176, h: 122, cpu: 60, conn: 8,  rtt: 79, status: 'healthy', color: '#1c1917' }
  ];

  // Keep stateRef synced with react state
  useEffect(() => {
    stateRef.current.rateMultiplier = rateMultiplier;
  }, [rateMultiplier]);

  useEffect(() => {
    stateRef.current.algoIndex = algoIndex;
  }, [algoIndex]);

  useEffect(() => {
    stateRef.current.isPaused = isPaused;
  }, [isPaused]);

  // Main lifecycle for SVG simulation
  useEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;

    const svgNS = 'http://www.w3.org/2000/svg';
    function el(tag, attrs = {}, parent = null) {
      const node = document.createElementNS(svgNS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      if (parent) parent.appendChild(node);
      return node;
    }

    const viewportGroup = svg.getElementById('viewport-group');
    const wiresLayer = svg.getElementById('wires-layer');
    const portsLayer = svg.getElementById('ports-layer');
    const packetsLayer = svg.getElementById('packets-layer');
    const clientsLayer = svg.getElementById('clients-layer');
    const lbCoreLayer = svg.getElementById('lb-core-layer');
    const serversLayer = svg.getElementById('servers-layer');
    const effectsLayer = svg.getElementById('effects-layer');

    const SERVERS = JSON.parse(JSON.stringify(SERVERS_INIT));
    const clientPaths = [];
    const serverPaths = [];
    const serverUI = new Map();
    let lbAlgoTextEl = null;

    // Pan & Zoom transform
    function updateTransform() {
      const { panX, panY, zoom } = stateRef.current;
      viewportGroup.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoom})`);
    }

    // Badge popup helper
    const badges = [];
    function spawnBadge(x, y, text, bg, fg) {
      const g = el('g', { transform: `translate(${x}, ${y})` }, effectsLayer);
      const w = text.length * 7.2 + 18;
      el('rect', {
        x: -w / 2, y: -11, width: w, height: 22, rx: 6,
        fill: bg, stroke: fg, 'stroke-width': '1.2'
      }, g);
      const t = el('text', {
        x: 0, y: 4, 'text-anchor': 'middle',
        class: 'mono', 'font-size': '10.5', 'font-weight': '700', fill: fg
      }, g);
      t.textContent = text;
      badges.push({ g, x, y, age: 0, maxAge: 0.9 });
    }

    function toggleServerState(serverId) {
      const s = SERVERS.find((srv) => srv.id === serverId);
      if (!s) return;
      s.status = s.status === 'healthy' ? 'down' : 'healthy';

      if (onSelectNode) {
        onSelectNode({ type: 'server', id: s.id, data: s });
      }

      const ui = serverUI.get(serverId);
      if (s.status === 'down') {
        s.cpu = 0;
        s.conn = 0;
        ui.boxEl.setAttribute('fill', '#faf5f4');
        ui.boxEl.setAttribute('stroke', '#dc2626');
        ui.outerRing.setAttribute('stroke', '#dc2626');
        ui.innerDot.setAttribute('fill', '#dc2626');
        ui.barFillEl.setAttribute('x2', ui.barX);
        ui.telemetryEl.textContent = 'OFFLINE · REROUTING';
        ui.telemetryEl.setAttribute('fill', '#dc2626');
        ui.wireEl.setAttribute('stroke', '#d6d0c4');
        ui.wireEl.setAttribute('stroke-dasharray', '5 5');
        ui.arrowEl.setAttribute('stroke', '#d6d0c4');
        spawnBadge(s.x, s.y - s.h / 2 - 18, `${s.name} DOWN`, '#fef2f2', '#dc2626');
      } else {
        s.cpu = 58 + Math.floor(Math.random() * 14);
        s.conn = 8 + Math.floor(Math.random() * 9);
        ui.boxEl.setAttribute('fill', '#fffefa');
        ui.boxEl.setAttribute('stroke', '#1c1917');
        ui.outerRing.setAttribute('stroke', '#10b981');
        ui.innerDot.setAttribute('fill', '#10b981');
        ui.barFillEl.setAttribute('x2', ui.barX + (ui.barW * s.cpu) / 100);
        ui.telemetryEl.textContent = `CPU ${s.cpu}% · ${s.conn} conn · ${s.rtt} ms`;
        ui.telemetryEl.setAttribute('fill', '#57534e');
        ui.wireEl.setAttribute('stroke', '#1c1917');
        ui.wireEl.removeAttribute('stroke-dasharray');
        ui.arrowEl.setAttribute('stroke', '#1c1917');
        spawnBadge(s.x, s.y - s.h / 2 - 18, `${s.name} ONLINE`, '#ecfdf5', '#059669');
      }
    }

    function cycleAlgorithm() {
      const nextIdx = (stateRef.current.algoIndex + 1) % ALGOS.length;
      stateRef.current.algoIndex = nextIdx;
      setAlgoIndex(nextIdx);
      const name = ALGOS[nextIdx];
      if (lbAlgoTextEl) lbAlgoTextEl.textContent = `[ ${name} ]`;
      spawnBadge(LB.x, LB.y - LB.h / 2 - 22, name, '#eff6ff', '#1d4ed8');

      if (onSelectNode) {
        onSelectNode({ type: 'lb', id: 'load-balancer' });
      }
    }

    function pickServer() {
      const healthy = SERVERS.filter((s) => s.status === 'healthy');
      if (!healthy.length) return null;
      const algo = ALGOS[stateRef.current.algoIndex];
      if (algo === 'LEAST CONN') {
        return healthy.reduce((best, cur) => (cur.conn < best.conn ? cur : best), healthy[0]);
      }
      if (algo === 'WEIGHTED') {
        const weighted = [];
        healthy.forEach((s) => {
          const w = s.id === 's1' ? 2 : 1;
          for (let i = 0; i < w; i++) weighted.push(s);
        });
        return weighted[stateRef.current.rrPointer++ % weighted.length];
      }
      return healthy[stateRef.current.rrPointer++ % healthy.length];
    }

    // Packet management
    const packets = [];

    function spawnIngressPacket(clientIdx) {
      const route = clientPaths[clientIdx];
      if (!route) return;
      const dot = el('circle', {
        r: 4.5,
        fill: '#4f7cff',
        stroke: '#fffefa',
        'stroke-width': '1.5',
        filter: 'url(#pkt-glow-blue)'
      }, packetsLayer);

      packets.push({
        el: dot,
        stage: 'client-to-lb',
        route,
        t: 0,
        speed: (320 + stateRef.current.rateMultiplier * 35) / route.length,
        clientIdx,
        targetServer: null
      });
    }

    function spawnDispatchPacket(clientIdx, server) {
      const sRoute = serverPaths.find((sp) => sp.server.id === server.id);
      if (!sRoute) return;
      const dot = el('circle', {
        r: 4.5,
        fill: '#4f7cff',
        stroke: '#fffefa',
        'stroke-width': '1.5',
        filter: 'url(#pkt-glow-blue)'
      }, packetsLayer);

      packets.push({
        el: dot,
        stage: 'lb-to-server',
        route: sRoute,
        t: 0,
        speed: (340 + stateRef.current.rateMultiplier * 35) / sRoute.length,
        clientIdx,
        targetServer: server
      });
    }

    function spawnAckReturnPacket(clientIdx, server) {
      const sRoute = serverPaths.find((sp) => sp.server.id === server.id);
      const cRoute = clientPaths[clientIdx];
      if (!sRoute || !cRoute) return;

      const dot = el('circle', {
        r: 4.5,
        fill: '#10b981',
        stroke: '#fffefa',
        'stroke-width': '1.5',
        filter: 'url(#pkt-glow-green)'
      }, packetsLayer);

      packets.push({
        el: dot,
        stage: 'server-to-lb',
        route: sRoute,
        t: 1,
        speed: (360 + stateRef.current.rateMultiplier * 35) / sRoute.length,
        clientIdx,
        targetServer: server
      });
    }

    function spawnClientAckPacket(clientIdx) {
      const cRoute = clientPaths[clientIdx];
      if (!cRoute) return;
      const dot = el('circle', {
        r: 4.2,
        fill: '#10b981',
        stroke: '#fffefa',
        'stroke-width': '1.5',
        filter: 'url(#pkt-glow-green)'
      }, packetsLayer);

      packets.push({
        el: dot,
        stage: 'lb-to-client',
        route: cRoute,
        t: 1,
        speed: (360 + stateRef.current.rateMultiplier * 35) / cRoute.length,
        clientIdx,
        targetServer: null
      });
    }

    // Expose burst function
    window.__triggerVisualizerBurst = () => {
      for (let i = 0; i < CLIENTS.length; i++) {
        spawnIngressPacket(i);
        setTimeout(() => spawnIngressPacket(i), 90);
      }
      spawnBadge(LB.x, LB.y - LB.h / 2 - 22, '⚡ BURST', '#eff6ff', '#1d4ed8');
    };

    // Build the schematic
    function buildTopology() {
      wiresLayer.innerHTML = '';
      portsLayer.innerHTML = '';
      clientsLayer.innerHTML = '';
      lbCoreLayer.innerHTML = '';
      serversLayer.innerHTML = '';
      clientPaths.length = 0;
      serverPaths.length = 0;
      serverUI.clear();

      const lbTopX = LB.x;
      const lbTopY = LB.y - LB.h / 2;
      const trunkTopY = 232;

      // Central spine from trunk merge down to LB top port
      el('path', {
        d: `M ${lbTopX} ${trunkTopY} L ${lbTopX} ${lbTopY}`,
        stroke: '#1c1917',
        'stroke-width': '2'
      }, wiresLayer);

      // LB top entry ring
      el('circle', {
        cx: lbTopX, cy: lbTopY - 4, r: 4.5,
        fill: '#fffefa', stroke: '#1c1917', 'stroke-width': '1.8'
      }, portsLayer);

      // Client -> LB bus wires
      CLIENTS.forEach((c) => {
        const startX = c.x;
        const startY = c.y + c.h / 2 + 4;
        const r = 14;

        let d;
        if (Math.abs(startX - lbTopX) < 2) {
          d = `M ${startX} ${startY} L ${lbTopX} ${trunkTopY}`;
        } else if (startX < lbTopX) {
          d = `M ${startX} ${startY} L ${startX} ${trunkTopY - r} Q ${startX} ${trunkTopY} ${startX + r} ${trunkTopY} L ${lbTopX} ${trunkTopY}`;
        } else {
          d = `M ${startX} ${startY} L ${startX} ${trunkTopY - r} Q ${startX} ${trunkTopY} ${startX - r} ${trunkTopY} L ${lbTopX} ${trunkTopY}`;
        }

        const pathEl = el('path', {
          d,
          stroke: '#1c1917',
          'stroke-width': c.dashed ? '1.6' : '2',
          'stroke-dasharray': c.dashed ? '5 5' : 'none'
        }, wiresLayer);

        el('circle', {
          cx: startX, cy: c.y + c.h / 2 + 2, r: 3.5,
          fill: '#fffefa', stroke: '#1c1917', 'stroke-width': '1.6'
        }, portsLayer);

        clientPaths.push({ pathEl, length: pathEl.getTotalLength(), client: c });

        // Client Card
        const g = el('g', {
          transform: `translate(${c.x - c.w / 2}, ${c.y - c.h / 2})`,
          class: 'cursor-pointer'
        }, clientsLayer);

        el('rect', {
          x: 0, y: 0, width: c.w, height: c.h, rx: 10,
          fill: '#fffefa', stroke: '#1c1917', 'stroke-width': '1.8', filter: 'url(#card-shadow)'
        }, g);

        el('text', {
          x: c.w / 2, y: 27, 'text-anchor': 'middle',
          'font-size': '13', 'font-weight': '600', fill: '#1c1917'
        }, g).textContent = c.name;

        el('text', {
          x: c.w / 2, y: 46, 'text-anchor': 'middle',
          class: 'mono', 'font-size': '10.5', fill: '#78716c'
        }, g).textContent = `${c.ip} · ${c.region}`;

        g.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectNode) onSelectNode({ type: 'client', id: c.id, data: c });
        });
      });

      // LB -> Server bus wires
      const lbBotX = LB.x;
      const lbBotY = LB.y + LB.h / 2;
      const fanY = 532;

      el('path', {
        d: `M ${lbBotX} ${lbBotY} L ${lbBotX} ${fanY}`,
        stroke: '#1c1917', 'stroke-width': '2'
      }, wiresLayer);

      SERVERS.forEach((s) => {
        const endX = s.x;
        const endY = s.y - s.h / 2 - 4;
        const r = 18;

        let d;
        if (Math.abs(endX - lbBotX) < 2) {
          d = `M ${lbBotX} ${fanY} L ${endX} ${endY}`;
        } else if (endX < lbBotX) {
          d = `M ${lbBotX} ${fanY} L ${endX + r} ${fanY} Q ${endX} ${fanY} ${endX} ${fanY + r} L ${endX} ${endY}`;
        } else {
          d = `M ${lbBotX} ${fanY} L ${endX - r} ${fanY} Q ${endX} ${fanY} ${endX} ${fanY + r} L ${endX} ${endY}`;
        }

        const wireEl = el('path', {
          d,
          stroke: '#1c1917',
          'stroke-width': '2',
          'stroke-dasharray': 'none'
        }, wiresLayer);

        const arrowEl = el('path', {
          d: `M ${endX - 4.5} ${endY - 5} L ${endX} ${endY + 1} L ${endX + 4.5} ${endY - 5}`,
          stroke: '#1c1917', 'stroke-width': '1.8', fill: 'none'
        }, wiresLayer);

        serverPaths.push({ wireEl, arrowEl, length: wireEl.getTotalLength(), server: s });

        // Server Card
        const sg = el('g', {
          transform: `translate(${s.x - s.w / 2}, ${s.y - s.h / 2})`,
          class: 'clickable-node cursor-pointer'
        }, serversLayer);

        const boxEl = el('rect', {
          x: 0, y: 0, width: s.w, height: s.h, rx: 11,
          fill: '#fffefa', stroke: '#1c1917', 'stroke-width': '1.8',
          filter: 'url(#card-shadow)', class: 'card-box'
        }, sg);

        const titleEl = el('text', {
          x: 16, y: 28, 'font-size': '14', 'font-weight': '600', fill: '#1c1917'
        }, sg);
        titleEl.textContent = s.name;

        // Status target ring top-right
        const outerRing = el('circle', {
          cx: s.w - 22, cy: 23, r: 6.5,
          fill: 'none', stroke: '#10b981', 'stroke-width': '1.6'
        }, sg);
        const innerDot = el('circle', {
          cx: s.w - 22, cy: 23, r: 2.6,
          fill: '#10b981'
        }, sg);

        const ipEl = el('text', {
          x: 16, y: 48, class: 'mono', 'font-size': '11', fill: '#78716c'
        }, sg);
        ipEl.textContent = s.ip;

        // CPU bar track + fill
        const barX = 16, barY = 76, barW = s.w - 32;
        el('line', {
          x1: barX, y1: barY, x2: barX + barW, y2: barY,
          stroke: '#e5dfd3', 'stroke-width': '3', 'stroke-linecap': 'round'
        }, sg);
        el('line', {
          x1: barX, y1: barY - 4, x2: barX, y2: barY + 4,
          stroke: '#d6d0c4', 'stroke-width': '1.2'
        }, sg);
        el('line', {
          x1: barX + barW, y1: barY - 4, x2: barX + barW, y2: barY + 4,
          stroke: '#d6d0c4', 'stroke-width': '1.2'
        }, sg);

        const barFillEl = el('line', {
          x1: barX, y1: barY, x2: barX + (barW * s.cpu) / 100, y2: barY,
          stroke: s.color, 'stroke-width': '3.5', 'stroke-linecap': 'round'
        }, sg);

        const telemetryEl = el('text', {
          x: 16, y: 102, class: 'mono', 'font-size': '10.5', fill: '#57534e'
        }, sg);
        telemetryEl.textContent = `CPU ${s.cpu}% · ${s.conn} conn · ${s.rtt} ms`;

        sg.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleServerState(s.id);
        });

        serverUI.set(s.id, { sg, boxEl, titleEl, outerRing, innerDot, barFillEl, barX, barW, telemetryEl, wireEl, arrowEl });
      });

      // Central Load Balancer Core Card
      const lg = el('g', {
        transform: `translate(${LB.x - LB.w / 2}, ${LB.y - LB.h / 2})`,
        class: 'cursor-pointer'
      }, lbCoreLayer);

      el('rect', {
        x: 0, y: 0, width: LB.w, height: LB.h, rx: 12,
        fill: '#fffefa', stroke: '#3b82f6', 'stroke-width': '2.2',
        filter: 'url(#lb-glow)', class: 'card-box'
      }, lg);

      el('text', {
        x: LB.w / 2, y: 31, 'text-anchor': 'middle',
        'font-size': '15', 'font-weight': '700', fill: '#1c1917'
      }, lg).textContent = 'Load Balancer Core';

      el('text', {
        x: LB.w / 2, y: 50, 'text-anchor': 'middle',
        class: 'mono', 'font-size': '11.5', fill: '#78716c'
      }, lg).textContent = `VIP: ${LB.vip}`;

      el('line', {
        x1: 12, y1: 64, x2: LB.w - 12, y2: 64,
        stroke: '#e5dfd3', 'stroke-width': '1.2'
      }, lg);

      el('circle', {
        cx: LB.w / 2, cy: 64, r: 4,
        fill: '#1c1917'
      }, lg);

      lbAlgoTextEl = el('text', {
        x: LB.w / 2, y: 90, 'text-anchor': 'middle',
        class: 'mono', 'font-size': '11.5', 'font-weight': '600', 'letter-spacing': '0.8', fill: '#44403c'
      }, lg);
      lbAlgoTextEl.textContent = `[ ${ALGOS[stateRef.current.algoIndex]} ]`;

      lbCoreLayer.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleAlgorithm();
      });
    }

    buildTopology();

    // Spawn initial packets
    for (let i = 0; i < CLIENTS.length; i++) spawnIngressPacket(i);

    // Pan & Zoom Event Listeners
    const onPointerDown = (e) => {
      if (e.target.closest('.hud-btn') || e.target.closest('.clickable-node') || e.target.closest('button')) return;
      stateRef.current.dragging = true;
      stateRef.current.startX = e.clientX - stateRef.current.panX;
      stateRef.current.startY = e.clientY - stateRef.current.panY;
    };

    const onPointerMove = (e) => {
      if (!stateRef.current.dragging) return;
      stateRef.current.panX = e.clientX - stateRef.current.startX;
      stateRef.current.panY = e.clientY - stateRef.current.startY;
      updateTransform();
    };

    const onPointerUp = () => {
      stateRef.current.dragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      stateRef.current.zoom = Math.max(0.55, Math.min(2.4, stateRef.current.zoom * factor));
      updateTransform();
    };

    wrap.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    wrap.addEventListener('wheel', onWheel, { passive: false });

    // Expose zoom controls
    window.__zoomIn = () => {
      stateRef.current.zoom = Math.min(2.4, stateRef.current.zoom * 1.15);
      updateTransform();
    };
    window.__zoomOut = () => {
      stateRef.current.zoom = Math.max(0.55, stateRef.current.zoom / 1.15);
      updateTransform();
    };
    window.__resetView = () => {
      stateRef.current.panX = 0;
      stateRef.current.panY = 0;
      stateRef.current.zoom = 1;
      updateTransform();
    };

    // Animation Tick Loop
    let animationFrameId;
    let lastTime = performance.now();
    let emitAccum = 0;
    let clientTurn = 0;
    let telemetryTimer = 0;

    function tick(now) {
      animationFrameId = requestAnimationFrame(tick);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!stateRef.current.isPaused) {
        emitAccum += dt * (2.6 * stateRef.current.rateMultiplier);
        while (emitAccum >= 1) {
          emitAccum -= 1;
          spawnIngressPacket(clientTurn % CLIENTS.length);
          clientTurn++;
        }

        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i];
          if (p.stage === 'client-to-lb') {
            p.t += p.speed * dt;
            if (p.t >= 1) {
              p.el.remove();
              packets.splice(i, 1);
              const srv = pickServer();
              if (srv) spawnDispatchPacket(p.clientIdx, srv);
              continue;
            }
            const pt = p.route.pathEl.getPointAtLength(p.t * p.route.length);
            p.el.setAttribute('cx', pt.x);
            p.el.setAttribute('cy', pt.y);
          } else if (p.stage === 'lb-to-server') {
            p.t += p.speed * dt;
            if (p.t >= 1) {
              p.el.remove();
              packets.splice(i, 1);
              if (p.targetServer && p.targetServer.status === 'healthy') {
                p.targetServer.conn = Math.min(99, p.targetServer.conn + 1);
                spawnAckReturnPacket(p.clientIdx, p.targetServer);
              }
              continue;
            }
            const pt = p.route.wireEl.getPointAtLength(p.t * p.route.length);
            p.el.setAttribute('cx', pt.x);
            p.el.setAttribute('cy', pt.y);
          } else if (p.stage === 'server-to-lb') {
            p.t -= p.speed * dt;
            if (p.t <= 0) {
              p.el.remove();
              packets.splice(i, 1);
              spawnClientAckPacket(p.clientIdx);
              continue;
            }
            const pt = p.route.wireEl.getPointAtLength(p.t * p.route.length);
            p.el.setAttribute('cx', pt.x);
            p.el.setAttribute('cy', pt.y);
          } else if (p.stage === 'lb-to-client') {
            p.t -= p.speed * dt;
            if (p.t <= 0) {
              p.el.remove();
              packets.splice(i, 1);
              continue;
            }
            const pt = p.route.pathEl.getPointAtLength(p.t * p.route.length);
            p.el.setAttribute('cx', pt.x);
            p.el.setAttribute('cy', pt.y);
          }
        }

        // Update floating badges
        for (let i = badges.length - 1; i >= 0; i--) {
          const b = badges[i];
          b.age += dt;
          if (b.age >= b.maxAge) {
            b.g.remove();
            badges.splice(i, 1);
            continue;
          }
          const p = b.age / b.maxAge;
          b.g.setAttribute('transform', `translate(${b.x}, ${b.y - p * 18})`);
          b.g.setAttribute('opacity', String(1 - p));
        }

        // Live server CPU/conn/RTT refresh
        telemetryTimer += dt;
        if (telemetryTimer >= 0.8) {
          telemetryTimer = 0;
          SERVERS.forEach((s) => {
            if (s.status !== 'healthy') return;
            const ui = serverUI.get(s.id);
            const deltaCpu = Math.floor(Math.random() * 7) - 3;
            s.cpu = Math.max(22, Math.min(94, s.cpu + deltaCpu + (stateRef.current.rateMultiplier > 4 ? 5 : 0)));
            s.conn = Math.max(4, Math.min(64, 8 + Math.floor(Math.random() * 14) * Math.min(stateRef.current.rateMultiplier, 4)));
            s.rtt = Math.max(48, Math.min(165, s.rtt + Math.floor(Math.random() * 9) - 4));
            ui.barFillEl.setAttribute('x2', ui.barX + (ui.barW * s.cpu) / 100);
            ui.telemetryEl.textContent = `CPU ${s.cpu}% · ${s.conn} conn · ${s.rtt} ms`;
          });
          const avgRtt = Math.round(
            SERVERS.filter((s) => s.status === 'healthy').reduce((acc, s) => acc + s.rtt, 0) /
              Math.max(1, SERVERS.filter((s) => s.status === 'healthy').length)
          );
          setHudRtt(avgRtt);
        }
      }
    }

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      wrap.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      wrap.removeEventListener('wheel', onWheel);
      delete window.__triggerVisualizerBurst;
      delete window.__zoomIn;
      delete window.__zoomOut;
      delete window.__resetView;
    };
  }, [onSelectNode]);

  // Rate multiplier change
  const handleRateChange = (rate) => {
    setRateMultiplier(rate);
    setHudRps(24 * rate);
  };

  // Traffic burst trigger
  const handleBurst = () => {
    if (window.__triggerVisualizerBurst) {
      window.__triggerVisualizerBurst();
    }
  };

  // Pause / Resume toggle
  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Algo cycle
  const handleAlgoCycle = () => {
    const nextIdx = (algoIndex + 1) % ALGOS.length;
    setAlgoIndex(nextIdx);
    stateRef.current.algoIndex = nextIdx;
    const svg = svgRef.current;
    if (svg) {
      const lbAlgoText = svg.querySelector('#lb-core-layer text.mono:last-child');
      if (lbAlgoText) lbAlgoText.textContent = `[ ${ALGOS[nextIdx]} ]`;
    }
  };

  return (
    <div
      id="canvas-wrap"
      ref={wrapRef}
      className="relative w-full h-[620px] lg:h-[660px] overflow-hidden rounded-2xl select-none font-['Inter',-apple-system,sans-serif] bg-[#f5f2ea] text-[#1c1917] cursor-grab active:cursor-grabbing border border-[#d9d2c3] shadow-subtle"
    >
      {/* ═════════════════════════════════════════════════════════════
          TOP COMPACT LIVE BAR (HUD)
          ═════════════════════════════════════════════════════════════ */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 flex-wrap pointer-events-auto">
        <div className="bg-[#fffefa]/95 border border-[#d6d0c4] rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold text-[#292524] inline-flex items-center gap-2 shadow-xs backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block animate-pulse" />
          <span>{hudRps} req/s</span>
          <span className="text-[#a8a29e]">|</span>
          <span>{hudRtt} ms RTT</span>
        </div>

        <button
          onClick={() => handleRateChange(1)}
          className={`border rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold cursor-pointer shadow-2xs transition-all ${
            rateMultiplier === 1
              ? 'bg-[#1c1917] text-[#fffefa] border-[#1c1917]'
              : 'bg-[#fffefa] border-[#c7c0b2] text-[#1c1917] hover:bg-[#faf6ec] hover:border-[#78716c]'
          }`}
        >
          1x
        </button>

        <button
          onClick={() => handleRateChange(4)}
          className={`border rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold cursor-pointer shadow-2xs transition-all ${
            rateMultiplier === 4
              ? 'bg-[#1c1917] text-[#fffefa] border-[#1c1917]'
              : 'bg-[#fffefa] border-[#c7c0b2] text-[#1c1917] hover:bg-[#faf6ec] hover:border-[#78716c]'
          }`}
        >
          4x
        </button>

        <button
          onClick={() => handleRateChange(12)}
          className={`border rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold cursor-pointer shadow-2xs transition-all ${
            rateMultiplier === 12
              ? 'bg-[#1c1917] text-[#fffefa] border-[#1c1917]'
              : 'bg-[#fffefa] border-[#c7c0b2] text-[#1c1917] hover:bg-[#faf6ec] hover:border-[#78716c]'
          }`}
        >
          12x
        </button>

        <button
          onClick={handleBurst}
          className="bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd] rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold cursor-pointer shadow-2xs transition-all active:translate-y-0.5"
        >
          ⚡ Traffic Burst
        </button>

        <button
          onClick={handleAlgoCycle}
          className="bg-[#fffefa] hover:bg-[#faf6ec] border border-[#c7c0b2] hover:border-[#78716c] text-[#1c1917] rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold cursor-pointer shadow-2xs transition-all"
        >
          Algo: {ALGOS[algoIndex]}
        </button>

        <button
          onClick={handleTogglePause}
          className={`border rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold cursor-pointer shadow-2xs transition-all ${
            isPaused
              ? 'bg-[#1c1917] text-[#fffefa] border-[#1c1917]'
              : 'bg-[#fffefa] border-[#c7c0b2] text-[#1c1917] hover:bg-[#faf6ec]'
          }`}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          MAIN SCHEMATIC SVG
          ═════════════════════════════════════════════════════════════ */}
      <svg
        id="schematic-svg"
        ref={svgRef}
        viewBox="0 0 1440 820"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block"
      >
        <defs>
          {/* Crisp subtle grid pattern */}
          <pattern id="minor-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#e7e2d6" strokeWidth="1" />
          </pattern>
          <pattern id="major-grid" width="180" height="180" patternUnits="userSpaceOnUse">
            <rect width="180" height="180" fill="url(#minor-grid)" />
            <path d="M 180 0 L 0 0 0 180" fill="none" stroke="#dcd5c6" strokeWidth="1.2" />
          </pattern>

          {/* Soft card drop shadow */}
          <filter id="card-shadow" x="-12%" y="-12%" width="126%" height="132%">
            <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#1c1917" floodOpacity="0.07" />
          </filter>

          {/* Blue glow for LB Core */}
          <filter id="lb-glow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#3b82f6" floodOpacity="0.28" />
          </filter>

          {/* Packet glow */}
          <filter id="pkt-glow-blue" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pkt-glow-green" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g id="viewport-group">
          {/* Blueprint / Schematic Background Sheet */}
          <g id="sheet-frame">
            <rect x="28" y="18" width="1384" height="784" rx="18" fill="#f7f4ec" stroke="#d9d2c3" strokeWidth="1.5" />
            <rect x="28" y="18" width="1384" height="784" rx="18" fill="url(#major-grid)" />

            {/* Crosshair registration marks */}
            <g stroke="#b8b0a0" strokeWidth="1.2">
              <path d="M 140 70 V 84 M 133 77 H 147" />
              <path d="M 1300 70 V 84 M 1293 77 H 1307" />
              <path d="M 140 794 V 808 M 133 801 H 147" />
              <path d="M 1300 794 V 808 M 1293 801 H 1307" />
            </g>
          </g>

          {/* Top-Right Legend Pill */}
          <g transform="translate(1070, 38)">
            <rect x="0" y="0" width="320" height="36" rx="10" fill="#fffefa" stroke="#ded7c8" strokeWidth="1.2" filter="url(#card-shadow)" />
            <circle cx="22" cy="18" r="4.5" fill="#4f7cff" />
            <text x="34" y="22" className="mono font-mono text-[11px] font-bold tracking-[0.6px]" fill="#4f7cff">
              INGRESS
            </text>

            <line x1="104" y1="9" x2="104" y2="27" stroke="#e5dfd3" strokeWidth="1.2" />

            <circle cx="120" cy="18" r="4.5" fill="#10b981" />
            <text x="132" y="22" className="mono font-mono text-[11px] font-bold tracking-[0.6px]" fill="#059669">
              ACK RESPONSE
            </text>

            <line x1="234" y1="9" x2="234" y2="27" stroke="#e5dfd3" strokeWidth="1.2" />

            <text x="247" y="22" className="mono font-mono text-[11px] font-semibold tracking-[0.5px]" fill="#78716c">
              NODES: 9
            </text>
          </g>

          {/* Routing Wires Layer */}
          <g id="wires-layer" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* Port Junction Dots & Ripple Layer */}
          <g id="ports-layer" />

          {/* Animated Packets Layer */}
          <g id="packets-layer" />

          {/* Client Nodes Layer */}
          <g id="clients-layer" />

          {/* Central Load Balancer Core */}
          <g id="lb-core-layer" className="cursor-pointer" />

          {/* Backend Servers Layer */}
          <g id="servers-layer" />

          {/* Floating Event Badges Layer */}
          <g id="effects-layer" />
        </g>
      </svg>

      {/* ═════════════════════════════════════════════════════════════
          BOTTOM HINT & ZOOM CONTROLS BAR
          ═════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-3.5 left-4 right-4 z-20 flex justify-between items-center pointer-events-none font-mono text-[11px] text-[#78716c]">
        <div className="hidden sm:block">
          Click <strong className="text-[#1c1917]">Load Balancer Core</strong> to switch algorithm • Click any <strong className="text-[#1c1917]">Server</strong> to toggle failover • Drag or scroll to pan/zoom
        </div>
        <div className="flex gap-1.5 pointer-events-auto ml-auto">
          <button
            onClick={() => window.__zoomIn && window.__zoomIn()}
            className="bg-[#fffefa] hover:bg-[#faf6ec] border border-[#c7c0b2] hover:border-[#78716c] text-[#1c1917] rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold cursor-pointer shadow-2xs"
          >
            +
          </button>
          <button
            onClick={() => window.__zoomOut && window.__zoomOut()}
            className="bg-[#fffefa] hover:bg-[#faf6ec] border border-[#c7c0b2] hover:border-[#78716c] text-[#1c1917] rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold cursor-pointer shadow-2xs"
          >
            −
          </button>
          <button
            onClick={() => window.__resetView && window.__resetView()}
            className="bg-[#fffefa] hover:bg-[#faf6ec] border border-[#c7c0b2] hover:border-[#78716c] text-[#1c1917] rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold cursor-pointer shadow-2xs"
          >
            Reset View
          </button>
        </div>
      </div>
    </div>
  );
}
