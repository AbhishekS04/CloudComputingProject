import { useSimulationStore } from '../store/simulationStore';
import { generateMockRequest } from './trafficGenerator';
import { algorithmManager } from './loadBalancingAlgorithms';
import { calculateServerLatency } from '../utils/calculations';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || null;
const SERVER_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

function mapBackendServer(srv, index, existing = {}) {
  let host = srv.url || '';
  let ip = srv.url || '';
  let port = 5001;
  try {
    const parsed = new URL(srv.url);
    host = parsed.hostname;
    ip = parsed.hostname;
    port = Number(parsed.port) || 5001;
  } catch {
    // fallback if url is not a full URL
  }

  let uiStatus = 'healthy';
  if (!srv.enabled || srv.status === 'offline') {
    uiStatus = 'disabled';
  } else if (srv.status === 'unhealthy') {
    uiStatus = 'failed';
  }

  const activeConns = srv.active_connections || 0;
  const targetCpu = uiStatus === 'healthy' ? Math.min(92, 18 + activeConns * 8 + ((srv.total_requests || 0) % 7)) : 0;

  return {
    id: srv.id,
    name: srv.name || srv.id,
    host,
    ip,
    status: uiStatus,
    weight: existing.weight || 1,
    cpu: existing.cpu !== undefined ? Math.round(existing.cpu * 0.6 + targetCpu * 0.4) : targetCpu,
    memory: uiStatus === 'healthy' ? (existing.memory || 42) : 15,
    activeConnections: activeConns,
    totalRequests: srv.total_requests || 0,
    successfulRequests: Math.max(0, (srv.total_requests || 0) - (srv.failed_requests || 0)),
    failedRequests: srv.failed_requests || 0,
    avgLatency: Math.round(srv.avg_response_time_ms || 0),
    color: existing.color || SERVER_COLORS[index % SERVER_COLORS.length],
    port,
    region: 'Azure-CentralIndia',
    specs: existing.specs || { cores: 2, ram: '4 GB', disk: '30 GB SSD' }
  };
}

class SimulationEngine {
  constructor() {
    this.intervalId = null;
    this.syncIntervalId = null;
    this.tickRate = 120; // 120ms per engine tick
    this.accumulator = 0;
    this.requestsThisSecond = 0;
    this.latencySamplesThisSecond = [];
    this.lastSecondTime = Date.now();
  }

  start() {
    if (this.intervalId) return;
    this.lastSecondTime = Date.now();
    if (BASE_URL) {
      this.syncFromBackend();
      this.syncIntervalId = setInterval(() => this.syncFromBackend(), 1500);
    }
    this.intervalId = setInterval(() => this.tick(), this.tickRate);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  async syncFromBackend() {
    if (!BASE_URL) return;
    try {
      const [serversRes, statsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/servers`),
        fetch(`${BASE_URL}/api/stats`)
      ]);
      if (!serversRes.ok || !statsRes.ok) {
        useSimulationStore.setState((state) => ({
          lbOnline: false,
          servers: state.servers.map((s) => ({ ...s, status: 'failed', activeConnections: 0, cpu: 0 }))
        }));
        return;
      }

      const serversData = await serversRes.json();
      const statsData = await statsRes.json();
      const rawServers = Array.isArray(serversData) ? serversData : (serversData.servers || []);

      useSimulationStore.setState((state) => {
        const existingMap = Object.fromEntries(state.servers.map((s) => [s.id, s]));
        const mappedServers = rawServers.map((srv, idx) => mapBackendServer(srv, idx, existingMap[srv.id]));

        return {
          servers: mappedServers,
          metrics: {
            ...state.metrics,
            totalRequests: statsData.total_requests ?? state.metrics.totalRequests,
            successfulRequests: statsData.successful_requests ?? state.metrics.successfulRequests,
            failedRequests: statsData.failed_requests ?? state.metrics.failedRequests,
            avgLatency: Math.round(statsData.avg_response_time_ms || state.metrics.avgLatency),
            activeConnectionsTotal: statsData.active_connections ?? state.metrics.activeConnectionsTotal
          }
        };
      });
    } catch {
      // Ignore transient network errors during polling
    }
  }

  tick() {
    const store = useSimulationStore.getState();
    if (!store.isRunning) return;

    const now = Date.now();
    const dt = this.tickRate / 1000;
    // Cap live HTTP dispatch rate to max 8 req/sec so browser doesn't flood Azure VMs
    const effectiveRps = BASE_URL ? Math.min(store.targetRps, 40) : store.targetRps;
    const expectedRequestsThisTick = effectiveRps * dt;
    this.accumulator += expectedRequestsThisTick;

    const requestsToEmit = Math.floor(this.accumulator);
    this.accumulator -= requestsToEmit;

    for (let i = 0; i < requestsToEmit; i++) {
      if (BASE_URL) {
        this.dispatchRealRequest();
      } else {
        this.dispatchSingleRequest();
      }
    }

    if (now - this.lastSecondTime >= 1000) {
      this.flushSecondMetrics(now);
      this.lastSecondTime = now;
    }
  }

  async dispatchRealRequest() {
    const store = useSimulationStore.getState();
    const mockReq = generateMockRequest();
    const packetId = `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    try {
      const res = await fetch(`${BASE_URL}/api/request`, {
        signal: AbortSignal.timeout(3000),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      const isSuccess = res.ok && data.status === 'success';
      const latency = Math.round(data.response_time_ms || 0);
      const latestStore = useSimulationStore.getState();
      const targetServer =
        latestStore.servers.find((s) => s.id === data.selected_server) ||
        latestStore.servers[0] ||
        null;

      this.requestsThisSecond++;
      if (isSuccess) {
        this.latencySamplesThisSecond.push(latency);
      }

      if (targetServer) {
        latestStore.addPacket({
          id: packetId,
          requestId: data.request_id || mockReq.id,
          client: mockReq.client,
          targetServer,
          isSuccess,
          latency,
          statusCode: res.status,
          createdTime: Date.now(),
          totalDuration: 1000
        });

        setTimeout(() => {
          useSimulationStore.setState((state) => ({
            activePackets: state.activePackets.filter((p) => p.id !== packetId)
          }));
        }, 1000);
      }

      useSimulationStore.setState((state) => ({
        requestLogs: [
          {
            id: data.request_id || mockReq.id,
            timestamp: Date.now(),
            client: mockReq.client,
            server: targetServer,
            serverName: targetServer ? `${targetServer.name} (${targetServer.ip})` : (data.selected_server || 'None (503)'),
            endpoint: '/api/process',
            method: 'POST',
            latency,
            status: res.status,
            statusText: isSuccess ? 'OK' : (data.message || 'Error')
          },
          ...state.requestLogs.slice(0, 199)
        ]
      }));
    } catch (err) {
      this.requestsThisSecond++;
      useSimulationStore.setState((state) => ({
        requestLogs: [
          {
            id: mockReq.id,
            timestamp: Date.now(),
            client: mockReq.client,
            server: null,
            serverName: 'Load Balancer Unreachable',
            endpoint: '/api/request',
            method: 'POST',
            latency: 0,
            status: 502,
            statusText: err.message || 'Network Error'
          },
          ...state.requestLogs.slice(0, 199)
        ]
      }));
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

    const isSuccess = selectedServer.status === 'degraded' ? Math.random() > 0.15 : true;
    const latency = calculateServerLatency(selectedServer);
    const statusCode = isSuccess ? 200 : 502;
    const statusText = isSuccess ? 'OK' : 'Bad Gateway';

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

    const newPacket = {
      id: packetId,
      requestId: mockReq.id,
      client: mockReq.client,
      targetServer: selectedServer,
      isSuccess,
      latency,
      statusCode,
      createdTime: Date.now(),
      totalDuration: 1200
    };

    store.addPacket(newPacket);

    this.requestsThisSecond++;
    this.latencySamplesThisSecond.push(latency);

    setTimeout(() => {
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

    const updatedServers = BASE_URL
      ? store.servers
      : store.servers.map((s) => {
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
        avgLatency: BASE_URL ? state.metrics.avgLatency : Math.round(state.metrics.avgLatency * 0.7 + avgSecLatency * 0.3),
        peakRps: Math.max(state.metrics.peakRps, rps),
        activeConnectionsTotal: updatedServers.reduce((sum, s) => sum + s.activeConnections, 0)
      }
    }));
  }
}

export const simulationEngine = new SimulationEngine();



