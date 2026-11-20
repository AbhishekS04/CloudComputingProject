import { create } from 'zustand';
import { DEFAULT_SERVERS, createNewServer } from '../simulation/serverManager';
import { MOCK_CLIENTS } from '../simulation/trafficGenerator';
import { ALGORITHM_INFO, algorithmManager } from '../simulation/loadBalancingAlgorithms';
import { calculateServerLatency } from '../utils/calculations';

export const useSimulationStore = create((set, get) => ({
  // Core simulation state
  isRunning: true,
  targetRps: 6, // Requests per second
  algorithm: 'ROUND_ROBIN',
  visualizerMode: '3D', // '2D' | '3D'
  selectedNode: { type: 'lb', id: 'load-balancer' }, // Default selection
  isDarkMode: typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false,

  // Infrastructure
  servers: DEFAULT_SERVERS,
  clients: MOCK_CLIENTS,

  // Active in-flight visual packets (shared by 2D & 3D visualizers)
  activePackets: [],

  // Live Metrics
  metrics: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    currentRps: 0,
    avgLatency: 22,
    peakRps: 6,
    activeConnectionsTotal: 36
  },

  // Rolling time series metrics for Recharts
  trafficHistory: Array.from({ length: 20 }, (_, i) => ({
    time: `${String(12 + Math.floor(i / 2)).padStart(2, '0')}:${String((i * 3) % 60).padStart(2, '0')}`,
    timestamp: Date.now() - (20 - i) * 3000,
    rps: 4 + Math.floor(Math.sin(i) * 2),
    latency: 22 + Math.floor(Math.cos(i) * 4),
    success: 4,
    failed: 0,
    srv1Cpu: 28,
    srv2Cpu: 34,
    srv3Cpu: 22
  })),

  // Logs & Audits
  requestLogs: [],
  events: [
    {
      id: 'evt-init',
      timestamp: Date.now() - 60000,
      type: 'info',
      title: 'Cluster Initialized',
      description: '3 backend servers connected and ready. Load balancer online.'
    }
  ],

  // Actions
  setIsRunning: (isRunning) => set({ isRunning }),
  setDarkMode: (isDarkMode) => {
    set({ isDarkMode });
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },
  toggleDarkMode: () => {
    const next = !get().isDarkMode;
    get().setDarkMode(next);
  },
  toggleSimulation: () => {
    const next = !get().isRunning;
    set({ isRunning: next });
    get().addEvent({
      type: next ? 'success' : 'warning',
      title: next ? 'Simulation Resumed' : 'Simulation Paused',
      description: `Traffic generation is now ${next ? 'active' : 'halted'}.`
    });
  },

  setTargetRps: (targetRps) => {
    const bounded = Math.max(1, Math.min(40, targetRps));
    set({ targetRps: bounded });
    get().addEvent({
      type: 'info',
      title: 'Traffic Rate Adjusted',
      description: `Target throughput set to ${bounded} requests/sec.`
    });
  },

  triggerTrafficSpike: () => {
    const oldRps = get().targetRps;
    const spikeRps = Math.min(35, oldRps + 18);
    set({ targetRps: spikeRps });
    get().addEvent({
      type: 'warning',
      title: 'Traffic Surge Injected',
      description: `Sudden spike to ${spikeRps} RPS! Backend servers adjusting.`
    });

    // Auto ramp down after 7 seconds
    setTimeout(() => {
      set({ targetRps: oldRps });
      get().addEvent({
        type: 'info',
        title: 'Traffic Spike Subsided',
        description: `Returned to baseline ${oldRps} requests/sec.`
      });
    }, 7000);
  },

  setAlgorithm: (algorithm) => {
    if (ALGORITHM_INFO[algorithm]) {
      algorithmManager.reset();
      set({ algorithm });
      get().addEvent({
        type: 'info',
        title: `Algorithm Switched: ${ALGORITHM_INFO[algorithm].name}`,
        description: ALGORITHM_INFO[algorithm].tagline
      });
    }
  },

  setVisualizerMode: (visualizerMode) => set({ visualizerMode }),

  setSelectedNode: (node) => set({ selectedNode: node }),

  addServer: (customProps = {}) => {
    const servers = get().servers;
    const newServer = createNewServer(servers.length, customProps);
    set({ servers: [...servers, newServer] });
    get().addEvent({
      type: 'success',
      title: `Server Added: ${newServer.name}`,
      description: `Joined cluster at ${newServer.ip}. Weight: ${newServer.weight}.`
    });
  },

  removeServer: (serverId) => {
    const servers = get().servers;
    if (servers.length <= 1) {
      get().addEvent({
        type: 'error',
        title: 'Cannot Remove Server',
        description: 'Cluster requires at least 1 backend server.'
      });
      return;
    }
    const target = servers.find((s) => s.id === serverId);
    set({
      servers: servers.filter((s) => s.id !== serverId),
      selectedNode: get().selectedNode?.id === serverId ? null : get().selectedNode
    });
    get().addEvent({
      type: 'warning',
      title: `Server Removed: ${target ? target.name : serverId}`,
      description: 'Node gracefully drained and detached from load balancer pool.'
    });
  },

  toggleServerStatus: (serverId) => {
    const servers = get().servers.map((s) => {
      if (s.id === serverId) {
        const nextStatus = s.status === 'healthy' ? 'disabled' : 'healthy';
        return {
          ...s,
          status: nextStatus,
          activeConnections: nextStatus === 'disabled' ? 0 : 4,
          cpu: nextStatus === 'disabled' ? 0 : 25
        };
      }
      return s;
    });
    set({ servers });
    const target = servers.find((s) => s.id === serverId);
    get().addEvent({
      type: target.status === 'healthy' ? 'success' : 'warning',
      title: `${target.name} ${target.status === 'healthy' ? 'Enabled' : 'Disabled'}`,
      description: target.status === 'healthy' 
        ? 'Restored into rotation. Health checks passing.' 
        : 'Traffic draining. No new requests will route to this node.'
    });
  },

  failServer: (serverId) => {
    const servers = get().servers.map((s) => {
      if (s.id === serverId) {
        return {
          ...s,
          status: 'failed',
          activeConnections: 0,
          cpu: 0,
          memory: Math.round(s.memory * 0.3)
        };
      }
      return s;
    });
    set({ servers });
    const target = servers.find((s) => s.id === serverId);
    get().addEvent({
      type: 'error',
      title: `🚨 Server Outage: ${target.name}`,
      description: 'Host unreachable (503 Service Unavailable). Failing over active traffic.'
    });
  },

  recoverServer: (serverId) => {
    const servers = get().servers.map((s) => {
      if (s.id === serverId) {
        return {
          ...s,
          status: 'healthy',
          cpu: 24,
          memory: 40,
          activeConnections: 2
        };
      }
      return s;
    });
    set({ servers });
    const target = servers.find((s) => s.id === serverId);
    get().addEvent({
      type: 'success',
      title: `Server Recovered: ${target.name}`,
      description: 'System restarted and passed 3 consecutive health checks.'
    });
  },

  updateServerWeight: (serverId, weight) => {
    const servers = get().servers.map((s) => {
      if (s.id === serverId) {
        return { ...s, weight: Math.max(1, Math.min(10, weight)) };
      }
      return s;
    });
    set({ servers });
  },

  resetSimulation: () => {
    algorithmManager.reset();
    set({
      isRunning: true,
      targetRps: 6,
      algorithm: 'ROUND_ROBIN',
      servers: DEFAULT_SERVERS.map((s) => ({
        ...s,
        status: 'healthy',
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        activeConnections: 10,
        cpu: 25,
        memory: 40
      })),
      activePackets: [],
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        currentRps: 0,
        avgLatency: 22,
        peakRps: 6,
        activeConnectionsTotal: 30
      },
      requestLogs: [],
      events: [
        {
          id: `evt-${Date.now()}`,
          timestamp: Date.now(),
          type: 'info',
          title: 'Simulation Reset',
          description: 'Metrics, packet queues, and server counters flushed to zero.'
        }
      ]
    });
  },

  addEvent: (event) => {
    const newEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      ...event
    };
    set((state) => ({
      events: [newEvent, ...state.events.slice(0, 49)]
    }));
  },

  clearLogs: () => set({ requestLogs: [] }),

  // Visual packet management
  addPacket: (packet) => {
    set((state) => ({
      activePackets: [...state.activePackets.slice(-30), packet]
    }));
  },

  removePacket: (packetId) => {
    set((state) => ({
      activePackets: state.activePackets.filter((p) => p.id !== packetId)
    }));
  },

  updatePacketProgress: (packetId, progress, phase) => {
    set((state) => ({
      activePackets: state.activePackets.map((p) => {
        if (p.id === packetId) {
          return { ...p, progress, phase };
        }
        return p;
      })
    }));
  }
}));
