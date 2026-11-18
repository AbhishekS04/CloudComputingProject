import { useSimulationStore } from '../store/simulationStore';
import { generateMockRequest } from './trafficGenerator';
import { algorithmManager } from './loadBalancingAlgorithms';
import { calculateServerLatency } from '../utils/calculations';

class SimulationEngine {
  constructor() {
    this.intervalId = null;
    this.tickRate = 120; // 120ms per engine tick
    this.accumulator = 0;
    this.requestsThisSecond = 0;
    this.latencySamplesThisSecond = [];
    this.lastSecondTime = Date.now();
  }

  start() {
    if (this.intervalId) return;
    this.lastSecondTime = Date.now();
    this.intervalId = setInterval(() => this.tick(), this.tickRate);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick() {
    const store = useSimulationStore.getState();
    if (!store.isRunning) return;

    const now = Date.now();
    const dt = (this.tickRate / 1000); // seconds per tick
    const expectedRequestsThisTick = store.targetRps * dt;
    this.accumulator += expectedRequestsThisTick;

    // Number of requests to dispatch this tick
    const requestsToEmit = Math.floor(this.accumulator);
    this.accumulator -= requestsToEmit;

    for (let i = 0; i < requestsToEmit; i++) {
      this.dispatchSingleRequest();
    }

    // Every ~1 second, update rolling metrics & history
    if (now - this.lastSecondTime >= 1000) {
      this.flushSecondMetrics(now);
      this.lastSecondTime = now;
    }
  }

  dispatchSingleRequest() {
    const store = useSimulationStore.getState();
    const mockReq = generateMockRequest();
    const selectedServer = algorithmManager.selectServer(
      store.algorithm,
      store.servers,
      mockReq.clientIp
    );

    const packetId = `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    if (!selectedServer) {
      // All servers down! 503 Service Unavailable
      const failedLog = {
        id: mockReq.id,
        timestamp: mockReq.timestamp,
        client: mockReq.client,
        server: null,
        serverName: 'None (503)',
        endpoint: mockReq.endpoint,
        method: mockReq.method,
        latency: 12,
        status: 503,
        statusText: 'Service Unavailable'
      };

      useSimulationStore.setState((state) => ({
        metrics: {
          ...state.metrics,
          totalRequests: state.metrics.totalRequests + 1,
          failedRequests: state.metrics.failedRequests + 1
        },
        requestLogs: [failedLog, ...state.requestLogs.slice(0, 199)]
      }));

      this.requestsThisSecond++;
      return;
    }

    // Server found - calculate response & latency
    const isSuccess = selectedServer.status === 'degraded' ? Math.random() > 0.15 : true;
    const latency = calculateServerLatency(selectedServer);
    const statusCode = isSuccess ? 200 : 502;
    const statusText = isSuccess ? 'OK' : 'Bad Gateway';

    // Temporary bump server active connections & CPU
    useSimulationStore.setState((state) => ({
      servers: state.servers.map((s) => {
        if (s.id === selectedServer.id) {
          const newActive = s.activeConnections + 1;
          const cpuBump = Math.min(96, s.cpu + Math.round(Math.random() * 3 + 1));
          return {
            ...s,
            activeConnections: newActive,
            cpu: cpuBump,
            totalRequests: s.totalRequests + 1,
            successfulRequests: s.successfulRequests + (isSuccess ? 1 : 0),
            failedRequests: s.failedRequests + (isSuccess ? 0 : 1),
            avgLatency: Math.round((s.avgLatency * 4 + latency) / 5)
          };
        }
        return s;
      })
    }));

    // Register visual packet
    const newPacket = {
      id: packetId,
      requestId: mockReq.id,
      client: mockReq.client,
      targetServer: selectedServer,
      isSuccess,
      latency,
      statusCode,
      createdTime: Date.now(),
      totalDuration: 1200 // 1.2s round trip
    };

    store.addPacket(newPacket);

    this.requestsThisSecond++;
    this.latencySamplesThisSecond.push(latency);

    // Schedule packet lifecycle:
    // 0 -> 400ms: Client to LB
    // 400 -> 800ms: LB to Server
    // 800 -> 1200ms: Server back to Client
    setTimeout(() => {
      // Release server active connection after processing
      useSimulationStore.setState((state) => ({
        servers: state.servers.map((s) => {
          if (s.id === selectedServer.id) {
            return {
              ...s,
              activeConnections: Math.max(0, s.activeConnections - 1),
              cpu: Math.max(12, s.cpu - 2)
            };
          }
          return s;
        }),
        activePackets: state.activePackets.filter((p) => p.id !== packetId),
        metrics: {
          ...state.metrics,
          totalRequests: state.metrics.totalRequests + 1,
          successfulRequests: state.metrics.successfulRequests + (isSuccess ? 1 : 0),
          failedRequests: state.metrics.failedRequests + (isSuccess ? 0 : 1)
        },
        requestLogs: [
          {
            id: mockReq.id,
            timestamp: mockReq.timestamp,
            client: mockReq.client,
            server: selectedServer,
            serverName: selectedServer.name,
            endpoint: mockReq.endpoint,
            method: mockReq.method,
            latency,
            status: statusCode,
            statusText
          },
          ...state.requestLogs.slice(0, 199)
        ]
      }));
    }, 1200);
  }

  flushSecondMetrics(now) {
    const store = useSimulationStore.getState();
    const rps = this.requestsThisSecond;
    this.requestsThisSecond = 0;

    let avgSecLatency = store.metrics.avgLatency;
    if (this.latencySamplesThisSecond.length > 0) {
      const sum = this.latencySamplesThisSecond.reduce((a, b) => a + b, 0);
      avgSecLatency = Math.round(sum / this.latencySamplesThisSecond.length);
      this.latencySamplesThisSecond = [];
    }

    // Natural decay for inactive servers
    const updatedServers = store.servers.map((s) => {
      if (s.status === 'healthy') {
        const targetCpu = Math.max(15, Math.min(85, 12 + s.activeConnections * 2.5));
        const newCpu = Math.round(s.cpu * 0.8 + targetCpu * 0.2);
        return { ...s, cpu: newCpu };
      }
      return s;
    });

    const d = new Date(now);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

    const historyPoint = {
      time: timeStr,
      timestamp: now,
      rps,
      latency: avgSecLatency,
      success: Math.max(0, rps - (store.servers.every((s) => s.status === 'failed') ? rps : 0)),
      failed: store.servers.every((s) => s.status === 'failed' || s.status === 'disabled') ? rps : 0
    };

    // Attach server CPUs to history point for charts
    store.servers.forEach((s, idx) => {
      historyPoint[`srv${idx + 1}Cpu`] = s.cpu;
      historyPoint[s.name] = s.cpu;
    });

    const newHistory = [...store.trafficHistory.slice(-29), historyPoint];

    useSimulationStore.setState((state) => ({
      servers: updatedServers,
      trafficHistory: newHistory,
      metrics: {
        ...state.metrics,
        currentRps: rps,
        avgLatency: Math.round(state.metrics.avgLatency * 0.7 + avgSecLatency * 0.3),
        peakRps: Math.max(state.metrics.peakRps, rps),
        activeConnectionsTotal: updatedServers.reduce((sum, s) => sum + s.activeConnections, 0)
      }
    }));
  }
}

export const simulationEngine = new SimulationEngine();
