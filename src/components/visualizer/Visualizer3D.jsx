import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/simulationStore';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { formatPercent } from '../../utils/formatters';

// ============================================================================
// SPATIAL LAYOUT CONSTANTS (Grounded, Balanced, Zero Overlap)
// ============================================================================
const LB_POS = [0, 0, 0];

// 5 Clients arranged in a clean, spaced arc (Z = -5.2)
const CLIENT_CONFIGS = [
  { id: 'client-1', name: 'Web 1',     pos: [-5.6, 0, -5.2] },
  { id: 'client-2', name: 'Mobile',    pos: [-2.8, 0, -5.2] },
  { id: 'client-3', name: 'Web 2',     pos: [0,    0, -5.5] },
  { id: 'client-4', name: 'API Client',pos: [2.8,  0, -5.2] },
  { id: 'client-5', name: 'Edge Node', pos: [5.6,  0, -5.2] }
];

// 3 Servers arranged with generous spacing on the backend side (Z = 5.2)
const SERVER_POSITIONS = {
  0: [-4.2, 0, 5.2],
  1: [0,    0, 5.5],
  2: [4.2,  0, 5.2],
};

// ============================================================================
// SHARED MATHEMATICAL CONDUIT CURVES (Packets follow cables with 100% precision)
// ============================================================================
function getClientConduitCurve(clientPos) {
  const p0 = new THREE.Vector3(clientPos[0], 0.12, clientPos[2] + 0.65);
  const p2 = new THREE.Vector3(LB_POS[0], 0.18, LB_POS[2] - 1.3);
  const midX = (p0.x + p2.x) / 2;
  const midY = 0.42; // subtle ground arch
  const midZ = (p0.z + p2.z) / 2;
  const p1 = new THREE.Vector3(midX, midY, midZ);
  return new THREE.QuadraticBezierCurve3(p0, p1, p2);
}

function getServerConduitCurve(serverPos) {
  const p0 = new THREE.Vector3(LB_POS[0], 0.18, LB_POS[2] + 1.3);
  const p2 = new THREE.Vector3(serverPos[0], 0.15, serverPos[2] - 0.85);
  const midX = (p0.x + p2.x) / 2;
  const midY = 0.45; // subtle ground arch
  const midZ = (p0.z + p2.z) / 2;
  const p1 = new THREE.Vector3(midX, midY, midZ);
  return new THREE.QuadraticBezierCurve3(p0, p1, p2);
}

// ============================================================================
// 1. GROUNDED 3D CLIENT NODE (Flat Ground Decal Tag)
// ============================================================================
function ClientNode3D({ client, position, isSelected, onClick }) {
  return (
    <group position={position} onClick={onClick}>
      {/* Ground Contact Shadow / Pad */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 32]} />
        <meshBasicMaterial
          color={isSelected ? '#10B981' : '#DDD6C6'}
          transparent
          opacity={isSelected ? 0.35 : 0.18}
        />
      </mesh>

      {/* Grounded Base Platform */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[0.72, 0.78, 0.2, 32]} />
        <meshStandardMaterial
          color={isSelected ? '#D1FAE5' : '#FCFAF5'}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Laptop Base Plate */}
      <mesh position={[0, 0.22, 0]} rotation={[0, -Math.PI / 8, 0]} castShadow>
        <boxGeometry args={[0.62, 0.035, 0.46]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} metalness={0.3} />
      </mesh>

      {/* Laptop Keyboard Area */}
      <mesh position={[0, 0.24, 0.04]} rotation={[-Math.PI / 2, 0, -Math.PI / 8]}>
        <planeGeometry args={[0.52, 0.26]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.6} />
      </mesh>

      {/* Laptop Screen Bezel */}
      <group position={[0, 0.23, 0.22]} rotation={[-0.32, -Math.PI / 8, 0]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.62, 0.42, 0.03]} />
          <meshStandardMaterial color="#252820" roughness={0.4} />
        </mesh>
        {/* Glowing Screen Display */}
        <mesh position={[0, 0.2, -0.018]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.56, 0.36]} />
          <meshBasicMaterial color="#DDD6FE" />
        </mesh>
      </group>

      {/* TAG ON THE GROUND (Lying flat on the floor plane in front of the laptop, NEVER over the model) */}
      <Html
        position={[0, 0.02, 1.15]}
        center
        distanceFactor={16}
        className="pointer-events-auto"
      >
        <div
          onClick={onClick}
          className={`cursor-pointer px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold whitespace-nowrap border transition-all duration-200 select-none ${
            isSelected
              ? 'bg-[#C5E5C9] text-[#1E3A24] border-[#A3D2A7] scale-105 shadow-xs'
              : 'bg-white/95 text-charcoal-700 border-[#DDD6C6] shadow-2xs hover:bg-[#F5F2EA]'
          }`}
        >
          {client.name}
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// 2. GROUNDED 3D LOAD BALANCER NODE (Flat Ground Decal Tag)
// ============================================================================
function LoadBalancerNode3D({ position, isSelected, onClick, algorithm, isRunning }) {
  const ringRef = useRef();
  const prismRef = useRef();

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (ringRef.current && isRunning) {
      ringRef.current.rotation.y = time * 0.8;
    }
    if (prismRef.current && isRunning) {
      prismRef.current.rotation.y = -time * 0.25;
    }
  });

  return (
    <group position={position} onClick={onClick}>
      {/* Ground Footprint Ring */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.85, 48]} />
        <meshBasicMaterial
          color={isSelected ? '#10B981' : '#F59E0B'}
          transparent
          opacity={isSelected ? 0.6 : 0.25}
        />
      </mesh>

      {/* Grounded Solid Hexagonal Dais */}
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.5, 1.65, 0.44, 6]} />
        <meshStandardMaterial color="#EAE5D8" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Central Rotating Warm Peach Hexagonal Prism */}
      <mesh ref={prismRef} position={[0, 0.95, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.1, 1.2, 1.05, 6]} />
        <meshStandardMaterial
          color={isSelected ? '#FED7AA' : '#FFDDBC'}
          roughness={0.25}
          metalness={0.25}
          emissive="#FB923C"
          emissiveIntensity={isSelected ? 0.3 : 0.15}
        />
      </mesh>

      {/* Top Metallic Bevel Cap */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.06, 6]} />
        <meshStandardMaterial color="#FFEDD5" roughness={0.15} metalness={0.4} />
      </mesh>

      {/* Subtle Orbital Holo-Ring */}
      <mesh ref={ringRef} position={[0, 0.95, 0]} rotation={[0.2, 0, 0]}>
        <torusGeometry args={[1.7, 0.025, 16, 64]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.65} />
      </mesh>

      {/* TAG ON THE GROUND (Lying flat on the floor in front of the plinth, NEVER obscuring the prism) */}
      <Html
        position={[0, 0.02, 2.15]}
        center
        distanceFactor={16}
        className="pointer-events-auto"
      >
        <div
          onClick={onClick}
          className={`cursor-pointer px-3.5 py-1 rounded-xl text-center border transition-all duration-200 select-none ${
            isSelected
              ? 'bg-[#FED7AA] text-charcoal-900 border-[#252820] font-bold shadow-xs scale-105'
              : 'bg-white/95 text-charcoal-800 border-[#DDD6C6] shadow-2xs hover:bg-[#F5F2EA]'
          }`}
        >
          <div className="font-extrabold text-[11px] uppercase tracking-wider">
            Load Balancer
          </div>
          <div className="text-[9px] font-mono text-amber-700 font-bold">
            {algorithm.replace(/_/g, ' ')}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// 3. GROUNDED 3D BACKEND SERVER RACK (Flat Ground Decal Tag)
// ============================================================================
function ServerNode3D({ server, position, isSelected, onClick }) {
  const isHealthy = server.status === 'healthy';
  const isDegraded = server.status === 'degraded';
  const isFailed = server.status === 'failed' || server.status === 'disabled';

  const statusColor = isHealthy ? '#10B981' : isDegraded ? '#F59E0B' : '#EF4444';

  return (
    <group position={position} onClick={onClick}>
      {/* Ground Contact Shadow / Pad */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial
          color={isFailed ? '#EF4444' : isSelected ? '#10B981' : '#DDD6C6'}
          transparent
          opacity={isFailed ? 0.35 : isSelected ? 0.4 : 0.18}
        />
      </mesh>

      {/* Server Rack Base Pedestal (Grounded firmly on floor) */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.2, 1.3]} />
        <meshStandardMaterial color="#DDD7C8" roughness={0.5} />
      </mesh>

      {/* Main Server Rack Tower Chassis */}
      <RoundedBox
        args={[1.4, 2.3, 1.15]}
        radius={0.06}
        smoothness={4}
        position={[0, 1.35, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={isFailed ? '#475569' : isSelected ? '#334155' : '#1E293B'}
          roughness={0.3}
          metalness={0.5}
        />
      </RoundedBox>

      {/* 3 Hot-Swap Blade Trays on Front Face */}
      {[0.65, 1.3, 1.95].map((yOffset, i) => (
        <group key={i} position={[0, yOffset, 0.59]}>
          <mesh>
            <planeGeometry args={[1.22, 0.42]} />
            <meshStandardMaterial color="#0F172A" roughness={0.6} />
          </mesh>
          {/* Metallic Handles */}
          <mesh position={[-0.52, 0, 0.02]}>
            <boxGeometry args={[0.04, 0.24, 0.03]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.8} />
          </mesh>
          <mesh position={[0.52, 0, 0.02]}>
            <boxGeometry args={[0.04, 0.24, 0.03]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.8} />
          </mesh>
          {/* Activity LED */}
          <mesh position={[0.42, 0.1, 0.015]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshBasicMaterial color={statusColor} />
          </mesh>
        </group>
      ))}

      {/* Main Top Status LED Beacon */}
      <mesh position={[0.48, 2.32, 0.59]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      {/* TAG ON THE GROUND (Lying flat on the floor in front of the server, NEVER hovering over the tower) */}
      <Html
        position={[0, 0.02, -1.35]}
        center
        distanceFactor={16}
        className="pointer-events-auto"
      >
        <div
          onClick={onClick}
          className={`cursor-pointer px-3 py-1 rounded-xl border transition-all duration-200 select-none ${
            isSelected
              ? 'bg-[#C5E5C9] text-[#1E3A24] border-[#A3D2A7] font-bold shadow-xs scale-105'
              : isFailed
              ? 'bg-rose-50 text-rose-800 border-rose-300 font-bold opacity-90'
              : 'bg-white/95 text-charcoal-800 border-[#DDD6C6] shadow-2xs hover:bg-[#F5F2EA]'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span>{server.name}</span>
            {isHealthy && <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />}
            {isDegraded && <AlertTriangle className="w-3 h-3 text-amber-600 inline" />}
            {isFailed && <XCircle className="w-3 h-3 text-rose-600 inline" />}
          </div>
          <div className="text-[9px] font-mono text-charcoal-400 mt-0.5">
            CPU: {formatPercent(server.cpu)} • {server.activeConnections} conn
          </div>
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// 4. VOLUMETRIC 3D CONDUIT CABLES (Built on the exact shared curve)
// ============================================================================
function ConduitCable3D({ curve, isFailed }) {
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 28, 0.032, 8, false);
  }, [curve]);

  return (
    <mesh geometry={tubeGeometry}>
      <meshStandardMaterial
        color={isFailed ? '#EF4444' : '#C7BDAA'}
        emissive={isFailed ? '#B91C1C' : '#94A3B8'}
        emissiveIntensity={isFailed ? 0.35 : 0.12}
        roughness={0.4}
        metalness={0.3}
        transparent
        opacity={isFailed ? 0.4 : 0.8}
      />
    </mesh>
  );
}

// ============================================================================
// 5. 100% PRECISE PACKET SYSTEM (Physically follows the exact cable line at 60 FPS)
// ============================================================================
function FastPacket({ packet, curveIn, curveOut }) {
  const meshRef = useRef();

  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = Date.now() - packet.createdTime;
    const duration = packet.totalDuration || 1200;
    const progress = Math.min(1, Math.max(0, elapsed / duration));

    let pt;
    if (progress < 0.5) {
      // Phase 1: Client -> Load Balancer (RIDES EXACTLY ON curveIn!)
      const t = progress / 0.5;
      pt = curveIn.getPoint(t);
    } else {
      // Phase 2: Load Balancer -> Server (RIDES EXACTLY ON curveOut!)
      const t = (progress - 0.5) / 0.5;
      pt = curveOut.getPoint(t);
    }

    if (pt) {
      // Position packet exactly on top of the cable line with a tiny offset
      meshRef.current.position.set(pt.x, pt.y + 0.04, pt.z);
    }
  });

  const isSuccess = packet.isSuccess;
  const color = !isSuccess ? '#EF4444' : '#38BDF8';

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.15, 14, 14]} />
      <meshBasicMaterial color={color} />
      {/* Outer Glow Halo */}
      <mesh scale={[1.4, 1.4, 1.4]}>
        <sphereGeometry args={[0.15, 14, 14]} />
        <meshBasicMaterial color={color} transparent opacity={0.32} />
      </mesh>
    </mesh>
  );
}

// ============================================================================
// 6. MAIN 3D THREE.JS CANVAS SCENE
// ============================================================================
export default function Visualizer3D({ onSelectNode, selectedNode }) {
  const servers = useSimulationStore((state) => state.servers);
  const clients = useSimulationStore((state) => state.clients);
  const activePackets = useSimulationStore((state) => state.activePackets);
  const algorithm = useSimulationStore((state) => state.algorithm);
  const isRunning = useSimulationStore((state) => state.isRunning);

  // Map clients to spatial positions
  const mappedClients = useMemo(() => {
    return clients.map((c, i) => ({
      ...c,
      pos: CLIENT_CONFIGS[i]?.pos || [i * 2.5 - 5, 0, -5.2]
    }));
  }, [clients]);

  // Map servers to spatial positions
  const mappedServers = useMemo(() => {
    return servers.map((s, i) => ({
      ...s,
      pos: SERVER_POSITIONS[i] || [i * 3.5 - 3.5, 0, 5.2]
    }));
  }, [servers]);

  // Pre-generate exact mathematical curves for every Client -> LB cable
  const clientCurves = useMemo(() => {
    const map = {};
    mappedClients.forEach((c) => {
      map[c.id] = getClientConduitCurve(c.pos);
    });
    return map;
  }, [mappedClients]);

  // Pre-generate exact mathematical curves for every LB -> Server cable
  const serverCurves = useMemo(() => {
    const map = {};
    mappedServers.forEach((s) => {
      map[s.id] = getServerConduitCurve(s.pos);
    });
    return map;
  }, [mappedServers]);

  return (
    <div className="relative w-full h-[600px] bg-[#F5F2EA] dark:bg-charcoal-900 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 overflow-hidden shadow-subtle select-none">
      <Canvas
        shadows
        camera={{ position: [14, 13, 15], fov: 36 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Soft studio lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[12, 18, 12]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={35}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[-10, 8, -10]} intensity={0.35} color="#BFDBFE" />

        {/* Stable Isometric Orbit Controls with smooth damping */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={10}
          maxDistance={28}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 6}
          dampingFactor={0.06}
        />

        {/* Ground Floor Grid */}
        <gridHelper args={[24, 24, '#C7BDAA', '#E0DBD0']} position={[0, -0.01, 0]} />

        {/* Volumetric Conduit Cables: Clients -> Load Balancer */}
        {mappedClients.map((c) => (
          <ConduitCable3D
            key={`cable-c-${c.id}`}
            curve={clientCurves[c.id]}
            isFailed={false}
          />
        ))}

        {/* Volumetric Conduit Cables: Load Balancer -> Backend Servers */}
        {mappedServers.map((s) => {
          const isFailed = s.status === 'failed' || s.status === 'disabled';
          return (
            <ConduitCable3D
              key={`cable-s-${s.id}`}
              curve={serverCurves[s.id]}
              isFailed={isFailed}
            />
          );
        })}

        {/* 3D Clients (Grounded, Left/Front) */}
        {mappedClients.map((c) => (
          <ClientNode3D
            key={c.id}
            client={c}
            position={c.pos}
            isSelected={selectedNode?.type === 'client' && selectedNode?.id === c.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode({ type: 'client', id: c.id, data: c });
            }}
          />
        ))}

        {/* 3D Load Balancer (Grounded, Center) */}
        <LoadBalancerNode3D
          position={LB_POS}
          isSelected={selectedNode?.type === 'lb'}
          algorithm={algorithm}
          isRunning={isRunning}
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode({ type: 'lb', id: 'load-balancer' });
          }}
        />

        {/* 3D Backend Servers (Grounded, Right/Back) */}
        {mappedServers.map((s) => (
          <ServerNode3D
            key={s.id}
            server={s}
            position={s.pos}
            isSelected={selectedNode?.type === 'server' && selectedNode?.id === s.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode({ type: 'server', id: s.id, data: s });
            }}
          />
        ))}

        {/* High-Performance 60 FPS Packets (Locked 100% directly to the Cable Curve) */}
        {activePackets.map((pkt) => {
          const clientId = pkt.client?.id || 'client-1';
          const serverId = pkt.targetServer?.id || 0;
          const curveIn = clientCurves[clientId] || clientCurves['client-1'];
          const curveOut = serverCurves[serverId] || serverCurves[0];

          if (!curveIn || !curveOut) return null;

          return (
            <FastPacket
              key={pkt.id}
              packet={pkt}
              curveIn={curveIn}
              curveOut={curveOut}
            />
          );
        })}
      </Canvas>

      {/* Camera Guidance Overlay */}
      <div className="absolute bottom-3 left-4 pointer-events-none text-[10px] font-mono font-bold text-charcoal-500 bg-white/80 dark:bg-charcoal-800/80 px-2.5 py-1 rounded-lg backdrop-blur-md border border-[#DDD6C6] dark:border-charcoal-700 shadow-2xs flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Left-click drag: Rotate • Scroll: Zoom • Right-click: Pan</span>
      </div>
    </div>
  );
}
