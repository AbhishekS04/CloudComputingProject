import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '../../store/simulationStore';
import { Server, Cpu, Activity, Globe, Shield, CheckCircle2, AlertTriangle, XCircle, ArrowDown } from 'lucide-react';
import { formatPercent, formatMs } from '../../utils/formatters';

export default function Visualizer2D({ onSelectNode, selectedNode }) {
  const servers = useSimulationStore((state) => state.servers);
  const clients = useSimulationStore((state) => state.clients);
  const activePackets = useSimulationStore((state) => state.activePackets);
  const algorithm = useSimulationStore((state) => state.algorithm);
  const isRunning = useSimulationStore((state) => state.isRunning);

  // SVG Coordinate layout
  // Width: 1000, Height: 600
  const width = 1000;
  const height = 620;

  // Client positions (top row)
  const clientCoords = useMemo(() => {
    const total = clients.length;
    const spacing = 720 / (total - 1 || 1);
    return clients.map((c, i) => ({
      ...c,
      x: 140 + i * spacing,
      y: 70
    }));
  }, [clients]);

  // Load Balancer position (center)
  const lbCoord = { x: 500, y: 250 };

  // Server positions (bottom row)
  const serverCoords = useMemo(() => {
    const total = servers.length;
    const spacing = Math.min(220, 800 / (total - 1 || 1));
    const startX = 500 - ((total - 1) * spacing) / 2;
    return servers.map((s, i) => ({
      ...s,
      x: startX + i * spacing,
      y: 470
    }));
  }, [servers]);

  // Find server coordinate by server id
  const getServerCoord = (serverId) => {
    return serverCoords.find((s) => s.id === serverId) || { x: 500, y: 470 };
  };

  const getClientCoord = (clientId) => {
    return clientCoords.find((c) => c.id === clientId) || { x: 500, y: 70 };
  };

  return (
    <div className="relative w-full h-[620px] bg-cream-100 dark:bg-charcoal-900 rounded-2xl border border-cream-300 dark:border-charcoal-700 overflow-hidden select-none shadow-subtle">
      {/* Background Subtle Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 dark:opacity-10">
        <defs>
          <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-charcoal-400" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradients for connections */}
          <linearGradient id="stream-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4A88E8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Connection lines: Clients to Load Balancer */}
        {clientCoords.map((client) => {
          const pathD = `M ${client.x} ${client.y + 24} C ${client.x} 180, ${lbCoord.x} 180, ${lbCoord.x} ${lbCoord.y - 36}`;
          return (
            <g key={`line-c-${client.id}`}>
              <path
                d={pathD}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="text-cream-400 dark:text-charcoal-700 transition-colors"
              />
            </g>
          );
        })}

        {/* 2. Connection lines: Load Balancer to Servers */}
        {serverCoords.map((server) => {
          const isFailed = server.status === 'failed' || server.status === 'disabled';
          const pathD = `M ${lbCoord.x} ${lbCoord.y + 36} C ${lbCoord.x} 360, ${server.x} 360, ${server.x} ${server.y - 40}`;
          return (
            <g key={`line-s-${server.id}`}>
              <path
                d={pathD}
                fill="none"
                stroke="currentColor"
                strokeWidth={isFailed ? "1.5" : "2.5"}
                strokeDasharray={isFailed ? "3 3" : undefined}
                className={
                  isFailed
                    ? 'text-rose-300 dark:text-rose-900/40 opacity-40'
                    : 'text-cream-400 dark:text-charcoal-700'
                }
              />
            </g>
          );
        })}

        {/* 3. Animated Traffic Packets */}
        <AnimatePresence>
          {activePackets.map((pkt) => {
            const client = getClientCoord(pkt.client?.id);
            const server = getServerCoord(pkt.targetServer?.id);

            // 3-segment trajectory
            const p1x = client.x;
            const p1y = client.y + 24;
            const lbX = lbCoord.x;
            const lbY = lbCoord.y;
            const sX = server.x;
            const sY = server.y - 40;

            const isSuccess = pkt.isSuccess;
            const packetColor = !isSuccess ? '#EF4444' : '#4A88E8';

            return (
              <motion.g key={pkt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Outward Request: Client -> LB -> Server */}
                <motion.circle
                  r={5}
                  fill={packetColor}
                  filter="url(#glow)"
                  initial={{ cx: p1x, cy: p1y }}
                  animate={{
                    cx: [p1x, lbX, sX],
                    cy: [p1y, lbY, sY],
                    scale: [1, 1.25, 1]
                  }}
                  transition={{
                    duration: 0.8,
                    ease: "easeInOut",
                    times: [0, 0.45, 1]
                  }}
                />

                {/* Return Response Packet: Server -> LB -> Client */}
                <motion.circle
                  r={4}
                  fill={isSuccess ? '#10B981' : '#F59E0B'}
                  initial={{ cx: sX, cy: sY, opacity: 0 }}
                  animate={{
                    cx: [sX, lbX, p1x],
                    cy: [sY, lbY, p1y],
                    opacity: [0, 0, 1, 1, 0]
                  }}
                  transition={{
                    duration: 0.6,
                    delay: 0.7,
                    ease: "easeInOut",
                    times: [0, 0.1, 0.5, 0.9, 1]
                  }}
                />
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* HTML Interactive Node Overlays */}
      {/* A. CLIENT NODES (Top Row) */}
      <div className="absolute top-4 inset-x-0 flex justify-around px-8 pointer-events-none">
        {clientCoords.map((client) => {
          const isSelected = selectedNode?.type === 'client' && selectedNode?.id === client.id;
          return (
            <motion.div
              key={client.id}
              whileHover={{ scale: 1.05 }}
              onClick={() => onSelectNode({ type: 'client', id: client.id, data: client })}
              className={`pointer-events-auto cursor-pointer flex flex-col items-center bg-cream-50 dark:bg-charcoal-800 px-3 py-2 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'border-sage-500 shadow-md ring-2 ring-sage-400/20'
                  : 'border-cream-300 dark:border-charcoal-700 hover:border-cream-400 shadow-subtle'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-charcoal-800 dark:text-cream-100">{client.name}</span>
              <span className="text-[9px] font-mono text-charcoal-400 dark:text-charcoal-400">{client.ip}</span>
              <span className="mt-1 px-1.5 py-0.2 text-[8px] font-medium rounded-full bg-cream-200 dark:bg-charcoal-700 text-charcoal-500 dark:text-cream-300">
                {client.region}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* B. LOAD BALANCER NODE (Center) */}
      <div
        className="absolute left-1/2 top-[245px] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
        onClick={() => onSelectNode({ type: 'lb', id: 'load-balancer' })}
      >
        <motion.div
          whileHover={{ scale: 1.04 }}
          className={`relative p-5 rounded-2xl bg-cream-50 dark:bg-charcoal-800 border transition-all duration-200 flex flex-col items-center min-w-[210px] shadow-card ${
            selectedNode?.type === 'lb'
              ? 'border-sage-500 ring-4 ring-sage-400/20'
              : 'border-cream-300 dark:border-charcoal-700 hover:border-sage-400'
          }`}
        >
          {/* Active pulse aura */}
          {isRunning && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sage-500"></span>
            </span>
          )}

          <div className="w-12 h-12 rounded-xl bg-sage-100 dark:bg-sage-950/60 text-sage-600 dark:text-sage-400 flex items-center justify-center mb-2 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>

          <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100 tracking-wide uppercase">
            Load Balancer
          </h4>
          <span className="text-[10px] text-charcoal-400 dark:text-charcoal-400 font-mono">
            vip: 10.0.0.1:443
          </span>

          <div className="mt-2.5 px-2.5 py-1 rounded-md bg-sage-50 dark:bg-charcoal-900 border border-sage-200 dark:border-sage-800 text-[11px] font-medium text-sage-700 dark:text-sage-300 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-sage-500" />
            <span>{algorithm.replace(/_/g, ' ')}</span>
          </div>
        </motion.div>
      </div>

      {/* C. BACKEND SERVERS (Bottom Row) */}
      <div className="absolute bottom-5 inset-x-0 flex justify-center items-end gap-5 px-6 pointer-events-none">
        {servers.map((server) => {
          const isSelected = selectedNode?.type === 'server' && selectedNode?.id === server.id;
          const isHealthy = server.status === 'healthy';
          const isDegraded = server.status === 'degraded';
          const isFailed = server.status === 'failed' || server.status === 'disabled';

          return (
            <motion.div
              key={server.id}
              whileHover={{ scale: isFailed ? 1 : 1.03 }}
              onClick={() => onSelectNode({ type: 'server', id: server.id, data: server })}
              className={`pointer-events-auto cursor-pointer w-48 bg-cream-50 dark:bg-charcoal-800 rounded-xl p-3.5 border transition-all duration-200 shadow-subtle ${
                isSelected
                  ? 'border-sage-500 ring-2 ring-sage-400/20 shadow-card'
                  : isFailed
                  ? 'border-rose-200 dark:border-rose-950 opacity-70 bg-rose-50/20'
                  : 'border-cream-300 dark:border-charcoal-700 hover:border-cream-400'
              }`}
            >
              {/* Server Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isHealthy
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : isDegraded
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-charcoal-800 dark:text-cream-100 leading-tight">
                      {server.name}
                    </h5>
                    <span className="text-[9px] font-mono text-charcoal-400 dark:text-charcoal-400">
                      {server.ip}
                    </span>
                  </div>
                </div>

                {/* Status Dot */}
                <div className="flex items-center">
                  {isHealthy && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  {isDegraded && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  {isFailed && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                </div>
              </div>

              {/* Metric Mini-Bars */}
              <div className="space-y-1.5 mt-2 pt-2 border-t border-cream-200 dark:border-charcoal-700/60">
                {/* CPU */}
                <div>
                  <div className="flex justify-between text-[10px] text-charcoal-500 dark:text-charcoal-400 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5" /> CPU
                    </span>
                    <span className="font-mono font-medium">{formatPercent(server.cpu)}</span>
                  </div>
                  <div className="w-full bg-cream-200 dark:bg-charcoal-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        server.cpu > 85 ? 'bg-rose-500' : server.cpu > 65 ? 'bg-amber-500' : 'bg-sage-500'
                      }`}
                      style={{ width: `${server.cpu}%` }}
                    />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex justify-between items-center text-[10px] text-charcoal-500 dark:text-charcoal-400 pt-1">
                  <span>
                    Conns: <strong className="font-mono text-charcoal-800 dark:text-cream-200">{server.activeConnections}</strong>
                  </span>
                  <span>
                    Lat: <strong className="font-mono text-charcoal-800 dark:text-cream-200">{formatMs(server.avgLatency)}</strong>
                  </span>
                </div>
              </div>

              {/* Weight badge if WRR */}
              {algorithm === 'WEIGHTED_ROUND_ROBIN' && (
                <div className="mt-2 text-center text-[9px] font-semibold text-charcoal-500 bg-cream-200/60 dark:bg-charcoal-700/60 py-0.5 rounded">
                  Weight: {server.weight}x
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Mode / Flow Legend Overlay */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-cream-50/90 dark:bg-charcoal-800/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-cream-300 dark:border-charcoal-700 text-[11px] text-charcoal-500 dark:text-cream-300 shadow-subtle">
        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse"></span> Request
        </span>
        <span className="text-charcoal-300 dark:text-charcoal-600">•</span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Response
        </span>
      </div>
    </div>
  );
}
