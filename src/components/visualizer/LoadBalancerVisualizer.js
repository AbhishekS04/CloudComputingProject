import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const PALETTE = {
  bg: 0xf7f3ea,
  gridLine: 0xe2dac8,
  ink: 0x232323,
  inkHex: '#232323',
  shadow: 0xd8cfc0,
  // Golden Amber block (Load Balancer -> matches "DNS resolver" in ref image)
  lbTop: 0xfef4d4,
  lbSideLeft: 0xf0cf86,
  lbSideRight: 0xe3be6d,
  // Periwinkle Blue block (Servers -> matches "Web Server" in ref image)
  srvTop: 0xe6effc,
  srvSideLeft: 0xb3cbf0,
  srvSideRight: 0x9ab5e3,
  // Lavender Cylinder/Block accent
  dbTop: 0xefe8fb,
  dbSide: 0xd3c4ee,
  // Client Laptop Pad
  padTop: 0xede7db,
  padSide: 0xd5cec0,
  // Packets
  packetRequest: 0xf08c65,  // Coral orange
  packetResponse: 0x78c67a, // Sage green
  packetHealth: 0xf7f3ea,
};

const DEFAULT_STATE = {
  loadBalancer: {
    id: 'lb-main',
    title: 'LOAD\nBALANCER',
    subtitle: 'ROUND ROBIN',
    statusPill: 'cached • active',
    position: { x: 0, z: 0 },
  },
  clients: [
    { id: 'c1', label: 'Web Client 1', position: { x: -3.6, z: -7.2 }, active: true },
    { id: 'c2', label: 'Web Client 2', position: { x: 0.2, z: -6.2 }, active: true },
    { id: 'c3', label: 'API Consumer', position: { x: 3.6, z: -4.4 }, active: true },
    { id: 'c4', label: 'Edge Worker', position: { x: 6.8, z: -2.0 }, active: true },
    { id: 'c5', label: 'Mobile Client', position: { x: 9.8, z: 0.4 }, active: false },
  ],
  servers: [
    { id: 'srv-a', name: 'Server A', cpu: 48, connections: 15, healthy: true, position: { x: -7.2, z: 1.5 } },
    { id: 'srv-b', name: 'Server B', cpu: 60, connections: 18, healthy: true, position: { x: -3.8, z: 4.5 } },
    { id: 'srv-c', name: 'Server C', cpu: 38, connections: 11, healthy: true, position: { x: -0.4, z: 7.5 } },
  ],
};

export class LoadBalancerVisualizer {
  constructor(container, initialState = {}, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.state = {
      loadBalancer: { ...DEFAULT_STATE.loadBalancer, ...(initialState.loadBalancer || {}) },
      clients: initialState.clients || DEFAULT_STATE.clients,
      servers: initialState.servers || DEFAULT_STATE.servers,
    };

    this.nodesMap = new Map();
    this.routes = [];
    this.packets = [];
    this.domPills = new Map();
    this.clock = new THREE.Clock();
    this.rrIndex = 0;
    this.spawnTimer = 0;

    this._initDOM();
    this._initThree();
    this._buildFloorGrid();
    this._buildSceneGraph();
    this._bindEvents();
    this._animate();
  }

  _initDOM() {
    this.container.classList.add('lb-visualizer-root');
    this.container.innerHTML = '';

    this.canvasHost = document.createElement('div');
    this.canvasHost.className = 'lb-visualizer-canvas';
    this.container.appendChild(this.canvasHost);

    this.overlay = document.createElement('div');
    this.overlay.className = 'lb-visualizer-overlay';
    this.container.appendChild(this.overlay);

    this.legend = document.createElement('div');
    this.legend.className = 'lb-visualizer-legend';
    this.legend.innerHTML = `
      <span class="lb-legend-item"><i class="lb-legend-dot lb-legend-dot--request"></i>request</span>
      <span class="lb-legend-item"><i class="lb-legend-dot lb-legend-dot--response"></i>response</span>
      <span class="lb-legend-item"><i class="lb-legend-dot lb-legend-dot--health"></i>handshake</span>
    `;
    this.container.appendChild(this.legend);
  }

  _initThree() {
    const width = this.container.clientWidth || 1000;
    const height = this.container.clientHeight || 640;
    const aspect = width / height;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.bg);

    // True Isometric Orthographic Camera
    this.viewSize = 11.2;
    this.camera = new THREE.OrthographicCamera(
      -this.viewSize * aspect,
      this.viewSize * aspect,
      this.viewSize,
      -this.viewSize,
      -100,
      200
    );

    // Classic Isometric angle: 45 deg azimuth, 35.264 deg elevation
    this.isoDir = new THREE.Vector3(1, 0.82, 1).normalize();
    this.camera.position.copy(this.isoDir.clone().multiplyScalar(45));
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvasHost.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enableRotate = true;
    this.controls.minPolarAngle = Math.PI / 4;
    this.controls.maxPolarAngle = Math.PI / 2.65;
    this.controls.minZoom = 0.65;
    this.controls.maxZoom = 1.85;
    this.controls.target.set(-0.4, 0.3, 0.2);
    this.controls.update();
  }

  // ---------------------------------------------------------------------------
  // ISOMETRIC FLOOR GRID
  // ---------------------------------------------------------------------------
  _buildFloorGrid() {
    const gridGroup = new THREE.Group();
    const size = 56;
    const step = 1.25;
    const points = [];

    for (let i = -size; i <= size; i += step) {
      points.push(new THREE.Vector3(i, 0, -size), new THREE.Vector3(i, 0, size));
      points.push(new THREE.Vector3(-size, 0, i), new THREE.Vector3(size, 0, i));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: PALETTE.gridLine,
      transparent: true,
      opacity: 0.85,
    });

    const lines = new THREE.LineSegments(geometry, material);
    lines.position.y = -0.02;
    gridGroup.add(lines);
    this.scene.add(gridGroup);
  }

  // ---------------------------------------------------------------------------
  // 2.5D ILLUSTRATION GEOMETRY HELPERS (SQUIRCLES, OUTLINES, DECALS)
  // ---------------------------------------------------------------------------
  _createRoundedRectShape(width, depth, radius) {
    const shape = new THREE.Shape();
    const hw = width / 2;
    const hd = depth / 2;
    const r = Math.min(radius, hw, hd);

    shape.moveTo(-hw + r, -hd);
    shape.lineTo(hw - r, -hd);
    shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
    shape.lineTo(hw, hd - r);
    shape.quadraticCurveTo(hw, hd, hw - r, hd);
    shape.lineTo(-hw + r, hd);
    shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
    shape.lineTo(-hw, -hd + r);
    shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    return shape;
  }

  /**
   * Builds a custom shaded + ink-outlined rounded isometric block
   * matching the "DNS resolver" and "Web Server" blocks in Reference Image 2.
   */
  _createIllustratedSquircleBlock({
    width = 2.6,
    depth = 2.6,
    height = 1.55,
    radius = 0.68,
    topColor = PALETTE.lbTop,
    leftColor = PALETTE.lbSideLeft,
    rightColor = PALETTE.lbSideRight,
    outlineThickness = 0.055,
  }) {
    const group = new THREE.Group();

    // 1. Soft Floor Contact Shadow
    const shadowShape = this._createRoundedRectShape(width * 1.06, depth * 1.06, radius * 1.06);
    const shadowGeo = new THREE.ShapeGeometry(shadowShape, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: PALETTE.shadow,
      transparent: true,
      opacity: 0.65,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(0.12, 0.005, 0.12);
    group.add(shadowMesh);

    // 2. Main Extruded Squircle Body with Custom Isometric Illustration Shader
    const shape = this._createRoundedRectShape(width, depth, radius);
    const extrudeSettings = {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.07,
      bevelThickness: 0.07,
      curveSegments: 28,
    };

    const bodyGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    bodyGeo.rotateX(-Math.PI / 2);
    bodyGeo.translate(0, 0.07, 0);
    bodyGeo.computeVertexNormals();

    const bodyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(topColor) },
        uLeftColor: { value: new THREE.Color(leftColor) },
        uRightColor: { value: new THREE.Color(rightColor) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normal);
          vWorldPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uLeftColor;
        uniform vec3 uRightColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          // Top face vs vertical walls
          float topMask = smoothstep(0.55, 0.85, vNormal.y);
          // Smooth gradient across front-left (z > x) to front-right (x > z)
          float sideFactor = clamp((vNormal.x - vNormal.z) * 0.5 + 0.5, 0.0, 1.0);
          vec3 wallColor = mix(uLeftColor, uRightColor, sideFactor);
          // Subtle vertical brightness gradient
          wallColor *= (0.96 + 0.06 * clamp(vWorldPos.y, 0.0, 1.5));
          vec3 finalColor = mix(wallColor, uTopColor, topMask);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });

    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(bodyMesh);

    // 3. Inverted-Hull Silhouette Ink Outline (#232323)
    const outlineMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(PALETTE.ink) },
        uThickness: { value: outlineThickness },
      },
      vertexShader: `
        uniform float uThickness;
        void main() {
          vec3 displaced = position + normalize(normal) * uThickness;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    const outlineMesh = new THREE.Mesh(bodyGeo, outlineMat);
    group.add(outlineMesh);

    // 4. Crisp Top-Bevel Perimeter Line Ring (Matches interior top rim line in Image 2)
    const pts2D = shape.getPoints(64);
    const ringPoints3D = pts2D.map((p) => new THREE.Vector3(p.x, height + 0.138, -p.y));
    ringPoints3D.push(ringPoints3D[0].clone());
    const topRingCurve = new THREE.CatmullRomCurve3(ringPoints3D, true);
    const topRingGeo = new THREE.TubeGeometry(topRingCurve, 96, 0.022, 6, true);
    const topRingMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink });
    const topRingMesh = new THREE.Mesh(topRingGeo, topRingMat);
    group.add(topRingMesh);

    return group;
  }

  /**
   * Renders crisp vector icon + multi-line bold monospace typography onto a plane
   * anchored to the isometric block face (exact match to "DNS resolver" & "Web Server").
   */
  _createBlockFaceGraphic({ iconType = 'globe', title = 'LOAD\nBALANCER', subtitle = '' }) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = PALETTE.inkHex;
    ctx.fillStyle = PALETTE.inkHex;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw Vector Icon in Upper Region
    const cx = 256;
    const cy = 148;

    if (iconType === 'globe') {
      // Matches the Globe icon on "DNS resolver" in Reference Image 2
      const r = 56;
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Vertical meridian ellipse
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.46, r, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Horizontal equator line
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.stroke();
    } else if (iconType === 'server') {
      // Matches the dual stacked server rack icon on "Web Server" in Reference Image 2
      ctx.lineWidth = 12;
      const boxW = 118;
      const boxH = 42;

      // Top rack unit
      this._strokeRoundedRect2D(ctx, cx - boxW / 2, cy - 48, boxW, boxH, 9, '#ffffff');
      ctx.fillStyle = PALETTE.inkHex;
      ctx.fillRect(cx - 38, cy - 31, 44, 9);
      ctx.beginPath();
      ctx.arc(cx + 32, cy - 27, 6, 0, Math.PI * 2);
      ctx.fill();

      // Bottom rack unit
      this._strokeRoundedRect2D(ctx, cx - boxW / 2, cy + 6, boxW, boxH, 9, '#ffffff');
      ctx.fillStyle = PALETTE.inkHex;
      ctx.fillRect(cx - 38, cy + 23, 44, 9);
      ctx.beginPath();
      ctx.arc(cx + 32, cy + 27, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Crisp Bold Monospace Typography Below Icon
    ctx.fillStyle = PALETTE.inkHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = title.split('\n');
    let startY = 278;
    lines.forEach((line, idx) => {
      ctx.font = idx === 0
        ? '800 50px "JetBrains Mono", monospace'
        : '700 44px "JetBrains Mono", monospace';
      ctx.fillText(line, cx, startY + idx * 56);
    });

    if (subtitle) {
      ctx.font = '700 28px "JetBrains Mono", monospace';
      ctx.fillStyle = '#4a4338';
      ctx.fillText(subtitle, cx, startY + lines.length * 54 + 12);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.25, 2.25, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  _strokeRoundedRect2D(ctx, x, y, w, h, r, fillHex) {
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

  // ---------------------------------------------------------------------------
  // CLIENT NODE: ISOMETRIC LAPTOP ON ROUNDED BASE PAD (Matches Image 2)
  // ---------------------------------------------------------------------------
  _createClientLaptopNode(scale = 0.85) {
    const root = new THREE.Group();

    // 1. Rounded Base Pad
    const pad = this._createIllustratedSquircleBlock({
      width: 2.35,
      depth: 2.15,
      height: 0.28,
      radius: 0.46,
      topColor: PALETTE.padTop,
      leftColor: PALETTE.padSide,
      rightColor: 0xc8c0b0,
      outlineThickness: 0.042,
    });
    root.add(pad);

    // 2. Laptop Group sitting on top of the pad
    const laptop = new THREE.Group();
    laptop.position.set(0.05, 0.43, 0.05);
    // Orient screen facing towards center/bottom-right isometric view
    laptop.rotation.y = Math.PI * 0.25;

    // Laptop Base Chassis
    const baseW = 1.32;
    const baseD = 0.96;
    const baseH = 0.07;
    const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);

    // Procedural Keyboard & Trackpad Texture
    const kbCanvas = document.createElement('canvas');
    kbCanvas.width = 256;
    kbCanvas.height = 192;
    const kctx = kbCanvas.getContext('2d');
    kctx.fillStyle = '#f5f2eb';
    kctx.fillRect(0, 0, 256, 192);
    kctx.strokeStyle = '#232323';
    kctx.lineWidth = 8;
    kctx.strokeRect(4, 4, 248, 184);

    // Keyboard Keys Grid
    kctx.fillStyle = '#d8d2c5';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 10; col++) {
        kctx.fillRect(22 + col * 21, 24 + row * 20, 16, 14);
      }
    }
    // Trackpad
    kctx.strokeStyle = '#b8b0a2';
    kctx.lineWidth = 3;
    kctx.strokeRect(92, 122, 72, 46);

    const kbTex = new THREE.CanvasTexture(kbCanvas);
    kbTex.colorSpace = THREE.SRGBColorSpace;

    const sideMat = new THREE.MeshBasicMaterial({ color: 0xded9ce });
    const topMat = new THREE.MeshBasicMaterial({ map: kbTex });
    const baseMesh = new THREE.Mesh(baseGeo, [
      sideMat, sideMat, topMat, sideMat, sideMat, sideMat,
    ]);
    laptop.add(baseMesh);

    // Base Outline
    const baseEdges = new THREE.EdgesGeometry(baseGeo);
    const baseLines = new THREE.LineSegments(
      baseEdges,
      new THREE.LineBasicMaterial({ color: PALETTE.ink })
    );
    laptop.add(baseLines);

    // Laptop Screen (Tilted back slightly)
    const screenGroup = new THREE.Group();
    screenGroup.position.set(0, 0.035, -baseD / 2 + 0.04);
    screenGroup.rotation.x = -0.22;

    const scrW = 1.30;
    const scrH = 0.88;
    const scrD = 0.06;
    const scrGeo = new THREE.BoxGeometry(scrW, scrH, scrD);
    scrGeo.translate(0, scrH / 2, 0);

    // Procedural Web Browser Window UI Texture (Matches purple/white window in Image 2)
    const uiCanvas = document.createElement('canvas');
    uiCanvas.width = 256;
    uiCanvas.height = 180;
    const uctx = uiCanvas.getContext('2d');
    // Dark Bezel
    uctx.fillStyle = '#232323';
    uctx.fillRect(0, 0, 256, 180);
    // Inner Screen White
    uctx.fillStyle = '#ffffff';
    uctx.fillRect(14, 14, 228, 148);
    // Browser Header Bar
    uctx.fillStyle = '#e5e0d5';
    uctx.fillRect(14, 14, 228, 22);
    // Traffic light dots
    uctx.fillStyle = '#f08c65';
    uctx.beginPath(); uctx.arc(28, 25, 4, 0, Math.PI * 2); uctx.fill();
    uctx.fillStyle = '#e8c468';
    uctx.beginPath(); uctx.arc(42, 25, 4, 0, Math.PI * 2); uctx.fill();
    // Purple Hero Banner (Exact match to laptop screen in Reference Image 2)
    uctx.fillStyle = '#c8baf3';
    uctx.fillRect(28, 48, 148, 64);
    // Grey Sidebar / Content lines
    uctx.fillStyle = '#dcd7cc';
    uctx.fillRect(186, 48, 40, 18);
    uctx.fillRect(186, 74, 40, 18);
    uctx.fillRect(28, 124, 100, 12);
    uctx.fillRect(28, 142, 70, 10);

    const uiTex = new THREE.CanvasTexture(uiCanvas);
    uiTex.colorSpace = THREE.SRGBColorSpace;

    const bezelMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink });
    const screenFrontMat = new THREE.MeshBasicMaterial({ map: uiTex });
    const screenMesh = new THREE.Mesh(scrGeo, [
      bezelMat, bezelMat, bezelMat, bezelMat, screenFrontMat, bezelMat,
    ]);
    screenGroup.add(screenMesh);

    laptop.add(screenGroup);
    root.add(laptop);
    root.scale.setScalar(scale);

    return root;
  }

  // ---------------------------------------------------------------------------
  // ORTHOGONAL ISOMETRIC PATHS WITH ROUNDED CORNERS & ARROWHEADS
  // ---------------------------------------------------------------------------
  _createOrthogonalRoute({ start, end, bendRatio = 0.5, dashed = false }) {
    const routeGroup = new THREE.Group();
    const y = 0.04;

    const p0 = new THREE.Vector3(start.x, y, start.z);
    const p3 = new THREE.Vector3(end.x, y, end.z);

    // Create an L-shaped or Z-shaped orthogonal grid-aligned path with rounded corners
    const midX = THREE.MathUtils.lerp(p0.x, p3.x, bendRatio);
    const corner1 = new THREE.Vector3(midX, y, p0.z);
    const corner2 = new THREE.Vector3(midX, y, p3.z);

    const points = this._buildRoundedPolyline([p0, corner1, corner2, p3], 0.55);
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.1);

    if (dashed) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x9e9689,
        dashSize: 0.28,
        gapSize: 0.22,
      });
      const dashedLine = new THREE.Line(lineGeo, lineMat);
      dashedLine.computeLineDistances();
      routeGroup.add(dashedLine);
    } else {
      const tubeGeo = new THREE.TubeGeometry(curve, 72, 0.036, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      routeGroup.add(tubeMesh);
    }

    // Add Sharp Triangular Arrowheads at Start and End (Matches Image 2)
    const arrowColor = dashed ? 0x9e9689 : PALETTE.ink;
    const tEnd = curve.getTangent(0.98);
    const endArrow = this._createFlatArrowhead(p3, tEnd, arrowColor);
    routeGroup.add(endArrow);

    const tStart = curve.getTangent(0.02).negate();
    const startArrow = this._createFlatArrowhead(p0, tStart, arrowColor);
    routeGroup.add(startArrow);

    this.scene.add(routeGroup);
    return { group: routeGroup, curve };
  }

  _buildRoundedPolyline(pts, radius) {
    const result = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const next = pts[i + 1];

      const v1 = new THREE.Vector3().subVectors(prev, curr);
      const v2 = new THREE.Vector3().subVectors(next, curr);
      const len1 = v1.length();
      const len2 = v2.length();

      if (len1 < 0.15 || len2 < 0.15) {
        result.push(curr);
        continue;
      }

      const r = Math.min(radius, len1 * 0.45, len2 * 0.45);
      const pA = curr.clone().add(v1.normalize().multiplyScalar(r));
      const pB = curr.clone().add(v2.normalize().multiplyScalar(r));

      const arcSteps = 8;
      for (let s = 0; s <= arcSteps; s++) {
        const t = s / arcSteps;
        const p = new THREE.Vector3()
          .copy(pA)
          .multiplyScalar((1 - t) * (1 - t))
          .add(curr.clone().multiplyScalar(2 * (1 - t) * t))
          .add(pB.clone().multiplyScalar(t * t));
        result.push(p);
      }
    }
    result.push(pts[pts.length - 1]);
    return result;
  }

  _createFlatArrowhead(position, direction, color) {
    const shape = new THREE.Shape();
    const size = 0.24;
    shape.moveTo(0, 0);
    shape.lineTo(-size * 0.75, size * 1.35);
    shape.lineTo(0, size * 1.05);
    shape.lineTo(size * 0.75, size * 1.35);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.y = 0.045;

    const angle = Math.atan2(direction.x, direction.z);
    mesh.rotation.y = angle + Math.PI;
    return mesh;
  }

  // ---------------------------------------------------------------------------
  // OUTLINED PACKET SPRITES (Coral Request & Green Response Circles)
  // ---------------------------------------------------------------------------
  _createPacketTexture(fillHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.fillStyle = fillHex;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = PALETTE.inkHex;
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  spawnPacket({ routeIndex, type = 'request', speed = 0.45, forward = true }) {
    if (!this.routes[routeIndex]) return;
    if (!this.packetTextures) {
      this.packetTextures = {
        request: this._createPacketTexture('#f08c65'),
        response: this._createPacketTexture('#78c67a'),
      };
    }

    const mat = new THREE.SpriteMaterial({
      map: this.packetTextures[type] || this.packetTextures.request,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.46, 0.46, 1);
    sprite.renderOrder = 15;
    this.scene.add(sprite);

    this.packets.push({
      sprite,
      curve: this.routes[routeIndex].curve,
      t: forward ? 0.06 : 0.94,
      speed: forward ? speed : -speed,
      type,
      routeIndex,
    });
  }

  // ---------------------------------------------------------------------------
  // SCENE ASSEMBLY
  // ---------------------------------------------------------------------------
  _buildSceneGraph() {
    // 1. Central Load Balancer Node (Golden Amber Block like "DNS resolver")
    const lbData = this.state.loadBalancer;
    const lbGroup = this._createIllustratedSquircleBlock({
      width: 2.95,
      depth: 2.95,
      height: 1.72,
      radius: 0.78,
      topColor: PALETTE.lbTop,
      leftColor: PALETTE.lbSideLeft,
      rightColor: PALETTE.lbSideRight,
    });
    lbGroup.position.set(lbData.position.x, 0, lbData.position.z);

    const lbFace = this._createBlockFaceGraphic({
      iconType: 'globe',
      title: lbData.title || 'LOAD\nBALANCER',
      subtitle: lbData.subtitle || 'ROUND ROBIN',
    });
    lbFace.position.set(0, 1.15, 0);
    lbGroup.add(lbFace);
    this.scene.add(lbGroup);
    this.nodesMap.set(lbData.id, lbGroup);

    // Floating Algorithm / Cache Pill below Load Balancer
    this._createDOMPill({
      id: 'pill-lb-algorithm',
      worldPos: new THREE.Vector3(lbData.position.x - 1.9, 0.25, lbData.position.z + 2.2),
      className: 'iso-pill iso-pill--route',
      html: `<span>${(lbData.subtitle || 'ROUND ROBIN').toLowerCase()} • active</span>`,
      onClick: () => {
        if (this.callbacks.onSelectNode) {
          this.callbacks.onSelectNode({ type: 'lb', id: 'load-balancer' });
        }
      },
    });

    // 2. Client Nodes (Laptops on Rounded Pads + Neo-Brutalist Client Pills)
    this.state.clients.forEach((client, idx) => {
      const clientMesh = this._createClientLaptopNode(0.84);
      clientMesh.position.set(client.position.x, 0, client.position.z);
      this.scene.add(clientMesh);
      this.nodesMap.set(client.id, clientMesh);

      // Client Pill Label
      this._createDOMPill({
        id: `pill-client-${client.id}`,
        worldPos: new THREE.Vector3(client.position.x - 0.85, 0.2, client.position.z + 1.35),
        className: 'iso-pill iso-pill--client',
        html: `
          <span class="iso-pill__icon">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="#232323" stroke-width="1.8">
              <circle cx="8" cy="5" r="2.6"/><path d="M3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4"/>
            </svg>
          </span>
          <span>${client.label || client.name}</span>
        `,
        onClick: () => {
          if (this.callbacks.onSelectNode) {
            this.callbacks.onSelectNode({ type: 'client', id: client.id, data: client });
          }
        },
      });

      // Route from Client -> Load Balancer
      const startPt = new THREE.Vector3(client.position.x - 0.4, 0, client.position.z + 0.95);
      const endPt = new THREE.Vector3(
        lbData.position.x + (idx - 2) * 0.35,
        0,
        lbData.position.z - 1.55
      );
      const route = this._createOrthogonalRoute({
        start: startPt,
        end: endPt,
        bendRatio: 0.55,
        dashed: idx === 4,
      });
      this.routes.push({ ...route, kind: 'client-to-lb', clientId: client.id });
    });

    // 3. Backend Server Nodes (Periwinkle Blue Blocks like "Web Server" + CPU Status Pills)
    this.state.servers.forEach((srv, idx) => {
      const srvGroup = this._createIllustratedSquircleBlock({
        width: 2.75,
        depth: 2.75,
        height: 1.62,
        radius: 0.72,
        topColor: PALETTE.srvTop,
        leftColor: PALETTE.srvSideLeft,
        rightColor: PALETTE.srvSideRight,
      });
      srvGroup.position.set(srv.position.x, 0, srv.position.z);

      const srvFace = this._createBlockFaceGraphic({
        iconType: 'server',
        title: (srv.name || `Server ${idx + 1}`).replace(' ', '\n'),
      });
      srvFace.position.set(0, 1.08, 0);
      srvGroup.add(srvFace);
      this.scene.add(srvGroup);
      this.nodesMap.set(srv.id, srvGroup);

      // Server Metric Pill above block (Matches [Gear] [Green Bar] [48% • 15 conn])
      this._createDOMPill({
        id: `pill-server-${srv.id}`,
        worldPos: new THREE.Vector3(srv.position.x, 2.35, srv.position.z),
        className: 'iso-pill iso-pill--metric',
        html: this._renderServerMetricHTML(srv),
        onClick: () => {
          if (this.callbacks.onSelectNode) {
            this.callbacks.onSelectNode({ type: 'server', id: srv.id, data: srv });
          }
        },
      });

      // Route from Load Balancer -> Server
      const startPt = new THREE.Vector3(
        lbData.position.x - 1.55,
        0,
        lbData.position.z + (idx - 1) * 0.42
      );
      const endPt = new THREE.Vector3(srv.position.x + 1.55, 0, srv.position.z - 0.2);
      const route = this._createOrthogonalRoute({
        start: startPt,
        end: endPt,
        bendRatio: 0.48,
        dashed: false,
      });
      this.routes.push({ ...route, kind: 'lb-to-server', serverId: srv.id });
    });
  }

  _renderServerMetricHTML(srv) {
    if (srv.status === 'failed') {
      return `
        <span class="iso-pill__meta" style="color: #e56b55; font-weight: 800;">FAILED</span>
        <span class="iso-pill__meta">• offline</span>
      `;
    }
    if (srv.status === 'disabled') {
      return `
        <span class="iso-pill__meta" style="color: #8c827a; font-weight: 800;">DISABLED</span>
        <span class="iso-pill__meta">• inactive</span>
      `;
    }
    const cpu = srv.cpu ?? 35;
    const conns = srv.connections ?? srv.activeConnections ?? 10;
    const barClass =
      cpu > 80
        ? 'iso-pill__bar-fill iso-pill__bar-fill--high'
        : cpu > 55
        ? 'iso-pill__bar-fill iso-pill__bar-fill--warn'
        : 'iso-pill__bar-fill';

    return `
      <svg class="iso-pill__gear" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>
      <div class="iso-pill__bar-track">
        <div class="${barClass}" style="width: ${Math.min(100, Math.max(0, cpu))}%"></div>
      </div>
      <span>${cpu}%</span>
      <span class="iso-pill__meta">• ${conns} conn</span>
    `;
  }

  _createDOMPill({ id, worldPos, className, html, onClick }) {
    const el = document.createElement('div');
    el.className = className;
    el.innerHTML = html;
    if (onClick) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
    }
    this.overlay.appendChild(el);
    this.domPills.set(id, { el, worldPos: worldPos.clone() });
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API FOR LIVE STATE UPDATES FROM YOUR APP
  // ---------------------------------------------------------------------------
  updateServerMetrics(serversData) {
    if (!serversData) return;
    this.state.servers = serversData;
    serversData.forEach((srv) => {
      const pill = this.domPills.get(`pill-server-${srv.id}`);
      if (pill) {
        pill.el.innerHTML = this._renderServerMetricHTML(srv);
      }
    });
  }

  updateAlgorithm(algorithmName) {
    if (!algorithmName) return;
    const pill = this.domPills.get('pill-lb-algorithm');
    if (pill) {
      pill.el.innerHTML = `<span>${algorithmName.replace(/_/g, ' ').toLowerCase()} • active</span>`;
    }
  }

  setIsRunning(isRunning) {
    this.isRunning = isRunning;
  }

  setTargetRps(targetRps) {
    this.targetRps = targetRps;
  }

  // ---------------------------------------------------------------------------
  // ANIMATION & PROJECTION LOOP
  // ---------------------------------------------------------------------------
  _updateDOMProjections() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    const tempV = new THREE.Vector3();

    this.domPills.forEach(({ el, worldPos }) => {
      tempV.copy(worldPos).project(this.camera);
      const x = (tempV.x * 0.5 + 0.5) * width;
      const y = (-(tempV.y * 0.5) + 0.5) * height;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    });
  }

  _updatePackets(dt) {
    if (this.isRunning !== false) {
      this.spawnTimer += dt;
      const targetInterval = THREE.MathUtils.clamp(1.2 / Math.max(1, this.targetRps || 4), 0.12, 1.2);
      // Automatically emit traffic packets along active client -> LB -> healthy server routes
      if (this.spawnTimer >= targetInterval) {
        this.spawnTimer = 0;
        const clientRoutes = this.routes
          .map((r, idx) => ({ ...r, idx }))
          .filter((r) => r.kind === 'client-to-lb');
        const serverRoutes = this.routes
          .map((r, idx) => ({ ...r, idx }))
          .filter((r) => r.kind === 'lb-to-server');

        if (clientRoutes.length && serverRoutes.length) {
          const activeClientRoutes = clientRoutes.filter((r) => {
            const cl = this.state.clients?.find((c) => c.id === r.clientId);
            return cl ? cl.active !== false : true;
          });
          const cCandidates = activeClientRoutes.length ? activeClientRoutes : clientRoutes;
          const cRoute = cCandidates[this.rrIndex % cCandidates.length];

          const healthyServerRoutes = serverRoutes.filter((r) => {
            const srv = this.state.servers?.find((s) => s.id === r.serverId);
            return srv ? srv.status !== 'failed' && srv.status !== 'disabled' : true;
          });
          const sCandidates = healthyServerRoutes.length ? healthyServerRoutes : serverRoutes;
          const sRoute = sCandidates[this.rrIndex % sCandidates.length];

          this.rrIndex++;

          // Request packet (Coral) from Client -> LB
          this.spawnPacket({
            routeIndex: cRoute.idx,
            type: 'request',
            speed: 0.55,
            forward: true,
          });

          // Dispatched Request packet (Coral) from LB -> Server
          this.spawnPacket({
            routeIndex: sRoute.idx,
            type: 'request',
            speed: 0.52,
            forward: true,
          });
        }
      }
    }

    for (let i = this.packets.length - 1; i >= 0; i--) {
      const pkt = this.packets[i];
      pkt.t += pkt.speed * dt;

      if (pkt.t >= 0.94 || pkt.t <= 0.05) {
        // When a request reaches a server, send a green response packet back
        if (pkt.type === 'request' && pkt.speed > 0 && pkt.t >= 0.94) {
          this.spawnPacket({
            routeIndex: pkt.routeIndex,
            type: 'response',
            speed: 0.52,
            forward: false,
          });
        }
        this.scene.remove(pkt.sprite);
        pkt.sprite.material.dispose();
        this.packets.splice(i, 1);
        continue;
      }

      const pos = pkt.curve.getPointAt(THREE.MathUtils.clamp(pkt.t, 0, 1));
      pkt.sprite.position.set(pos.x, 0.14, pos.z);
    }
  }

  _animate = () => {
    this.rafId = requestAnimationFrame(this._animate);
    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this._updatePackets(dt);
    this._updateDOMProjections();
    this.renderer.render(this.scene, this.camera);
  };

  _bindEvents() {
    this._onResize = () => {
      if (!this.container) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (!width || !height) return;

      const aspect = width / height;
      this.camera.left = -this.viewSize * aspect;
      this.camera.right = this.viewSize * aspect;
      this.camera.top = this.viewSize;
      this.camera.bottom = -this.viewSize;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };

    window.addEventListener('resize', this._onResize);

    if (typeof ResizeObserver !== 'undefined' && this.container) {
      this.resizeObserver = new ResizeObserver(() => {
        this._onResize();
      });
      this.resizeObserver.observe(this.container);
    }

    // Raycast click detection on 3D objects
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this._onPointerDown = (e) => {
      this._pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    this._onPointerUp = (e) => {
      if (!this._pointerDownPos) return;
      const dx = Math.abs(e.clientX - this._pointerDownPos.x);
      const dy = Math.abs(e.clientY - this._pointerDownPos.y);
      if (dx > 6 || dy > 6) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length > 0) {
        let hit = intersects[0].object;
        while (hit && hit !== this.scene) {
          for (const [id, group] of this.nodesMap.entries()) {
            if (hit === group) {
              if (id === this.state.loadBalancer.id || id === 'lb-main' || id === 'load-balancer') {
                this.callbacks.onSelectNode?.({ type: 'lb', id: 'load-balancer' });
                return;
              }
              const srv = this.state.servers?.find((s) => s.id === id);
              if (srv) {
                this.callbacks.onSelectNode?.({ type: 'server', id: srv.id, data: srv });
                return;
              }
              const cl = this.state.clients?.find((c) => c.id === id);
              if (cl) {
                this.callbacks.onSelectNode?.({ type: 'client', id: cl.id, data: cl });
                return;
              }
            }
          }
          hit = hit.parent;
        }
      }
    };

    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this._onPointerUp);
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._onResize);
    this.resizeObserver?.disconnect();
    if (this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
      this.renderer.domElement.removeEventListener('pointerup', this._onPointerUp);
    }
    this.controls?.dispose();
    this.renderer?.dispose();
  }
}
