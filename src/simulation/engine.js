import { useSimulationStore } from '../store/simulationStore';
import { generateMockRequest } from './trafficGenerator';
import { algorithmManager } from './loadBalancingAlgorithms';
import { calculateServerLatency } from '../utils/calculations';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const SERVER_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

const KNOWN_PRIVATE_IPS = {
  'server-1': '10.0.1.10',
  'server-2': '10.0.1.11',
  'server-3': '10.0.1.12',
  'srv-1': '10.0.1.10',
  'srv-2': '10.0.1.11',
  'srv-3': '10.0.1.12',
};

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
  const publicIp = srv.public_ip || (ip.includes(':') ? ip : `${ip}:${port}`);
  const privateIp = srv.private_ip || KNOWN_PRIVATE_IPS[srv.id] || `10.0.1.${10 + index}`;

  return {
    id: srv.id,
    name: srv.name || `Server ${String.fromCharCode(65 + index)}`,
    host,
    ip: publicIp,
    publicIp,
    privateIp,
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
    region: 'Azure Central India',
    specs: existing.specs || { cores: 2, ram: '4 GB', disk: '30 GB SSD' }
  };
}

class SimulationEngine {
  constructor() {
    this.intervalId = null;
    this.syncIntervalId = null;
    this.eventSource = null;
    this.tickRate = 120; // 120ms per engine tick
    this.accumulator = 0;
    this.requestsThisSecond = 0;
    this.latencySamplesThisSecond = [];
    this.lastSecondTime = Date.now();
    this.pendingLogs = [];
  }

  start() {
    if (this.intervalId) return;
    this.lastSecondTime = Date.now();

    this.syncFromBackend();
    this.syncIntervalId = setInterval(() => this.syncFromBackend(), 1500);
    this.initEventStream();

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
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  initEventStream() {
    if (typeof window === 'undefined') return;
    const url = BASE_URL || '';
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      this.eventSource = new EventSource(`${url}/api/stream`);

      this.eventSource.onopen = () => {
        useSimulationStore.setState({ lbOnline: true });
      };

      this.eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'request') {
            this.handleLiveRequestEvent(data);
          } else if (data.type === 'server_update') {
            this.syncFromBackend();
          } else if (data.type === 'algorithm' && data.algorithm) {
            useSimulationStore.setState({ algorithm: data.algorithm.toUpperCase() });
          } else if (data.type === 'lb_toggle' && typeof data.paused === 'boolean') {
            useSimulationStore.setState({ isRunning: !data.paused });
          }
        } catch {
          // ignore parsing error
        }
      };

      this.eventSource.onerror = () => {
        // SSE error - wait and retry
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        setTimeout(() => {
          if (!this.eventSource) {
            this.initEventStream();
          }
        }, 3000);
      };
    } catch {
      // EventSource not supported
    }
  }

  handleLiveRequestEvent(data) {
    const store = useSimulationStore.getState();
    const isSuccess = data.status === 'success';
    const latency = Math.round(data.response_time_ms || 25);
    const serverId = data.selected_server;

    this.requestsThisSecond++;
    if (isSuccess) {
      this.latencySamplesThisSecond.push(latency);
    }

    // 1. Dispatch lightweight visual event for 2D & 3D visualizers (0 React re-renders, 60 FPS)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lb-packet-event', {
          detail: {
            serverId,
            clientIp: data.client_ip || '198.51.100.4',
            isSuccess,
            latency,
            publicIp: data.public_ip,
            privateIp: data.private_ip,
            timestamp: Date.now()
          }
        })
      );
    }

    // Immediately update target server live counters and cluster metrics
    useSimulationStore.setState((state) => ({
      servers: state.servers.map((s) => {
        if (
          s.id === serverId ||
          s.name === serverId ||
          s.host === serverId ||
          (data.public_ip && s.publicIp && s.publicIp.includes(data.public_ip))
        ) {
          const newActive = (s.activeConnections || 0) + 1;
          const cpuBump = Math.min(96, Math.max(15, (s.cpu || 25) + Math.round(Math.random() * 3 - 1)));
          return {
            ...s,
            activeConnections: newActive,
            cpu: cpuBump,
            totalRequests: (s.totalRequests || 0) + 1,
            successfulRequests: (s.successfulRequests || 0) + (isSuccess ? 1 : 0),
            failedRequests: (s.failedRequests || 0) + (isSuccess ? 0 : 1),
            avgLatency: s.avgLatency ? Math.round((s.avgLatency * 4 + latency) / 5) : latency
          };
        }
        return s;
      }),
      metrics: {
        ...state.metrics,
        totalRequests: (state.metrics.totalRequests || 0) + 1,
        successfulRequests: (state.metrics.successfulRequests || 0) + (isSuccess ? 1 : 0),
        failedRequests: (state.metrics.failedRequests || 0) + (isSuccess ? 0 : 1)
      }
    }));

    // 2. Buffer log for non-blocking periodic flush
    const targetServer = store.servers.find((s) => s.id === serverId) || {
      id: serverId,
      name: serverId,
      ip: data.public_ip || serverId
    };

    const newLog = {
      id: data.request_id || `req-${Date.now()}`,
      timestamp: Date.now(),
      client: { id: 'term-client', name: 'Terminal Client', ip: data.client_ip || '198.51.100.4' },
      server: targetServer,
      serverName: `${targetServer.name || serverId} (${data.public_ip || targetServer.ip || 'Azure VM'})`,
      endpoint: '/api/process',
      method: 'POST',
      latency,
      status: data.status_code || (isSuccess ? 200 : 502),
      statusText: isSuccess ? 'OK' : 'Error'
    };

    this.pendingLogs.push(newLog);
    if (this.pendingLogs.length > 200) {
      this.pendingLogs.shift();
    }
  }

  async syncFromBackend() {
    const store = useSimulationStore.getState();
    if (store.clusterMode !== 'live' || !BASE_URL) return;

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
        if (state.clusterMode !== 'live') return state;
        const existingMap = Object.fromEntries(state.servers.map((s) => [s.id, s]));
        const mappedServers = rawServers.map((srv, idx) => mapBackendServer(srv, idx, existingMap[srv.id]));

        return {
          lbOnline: true,
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
    } catch (err) {
      useSimulationStore.setState((state) => ({
        lbOnline: false,
        metrics: {
          ...state.metrics,
          currentRps: 0
        }
      }));
    }
  }

  tick() {
    const store = useSimulationStore.getState();
    if (!store.isRunning) return;

    const now = Date.now();
    const dt = this.tickRate / 1000;

    if (store.clusterMode === 'dummy') {
      const expectedRequestsThisTick = store.targetRps * dt;
      this.accumulator += expectedRequestsThisTick;
      const requestsToEmit = Math.floor(this.accumulator);
      this.accumulator -= requestsToEmit;

      for (let i = 0; i < requestsToEmit; i++) {
        this.dispatchSingleRequest();
      }
    } else {
      // Live Azure Mode: All traffic is purely driven by the user's terminal/CLI or external clients.
      // Packets animate in real-time purely from the live SSE stream (/api/stream).
      // Zero synthetic requests are auto-dispatched from the browser.
    }

    if (now - this.lastSecondTime >= 1000) {
      this.flushSecondMetrics(now);
      this.lastSecondTime = now;
    }
  }

  async dispatchRealRequest() {
    const store = useSimulationStore.getState();
    if (!store.isRunning) return;

    // Sandbox / Dummy mode fallback: dispatch immediately via internal engine
    if (store.clusterMode === 'dummy' || !BASE_URL) {
      this.dispatchSingleRequest();
      return;
    }

    try {
      await fetch(`${BASE_URL}/api/request`, {
        signal: AbortSignal.timeout(3000),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      // Note: The SSE stream automatically receives the result and dispatches the visual event!
    } catch (err) {
      this.requestsThisSecond++;
      useSimulationStore.setState((state) => ({
        requestLogs: [
          {
            id: `err-${Date.now()}`,
            timestamp: Date.now(),
            client: { id: 'browser', name: 'Browser Client', ip: '127.0.0.1' },
            server: null,
            serverName: 'Load Balancer Gateway',
            endpoint: '/api/request',
            method: 'POST',
            latency: 0,
            status: 502,
            statusText: err.message || 'Connection Error'
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

    // Dispatch visual event for 2D & 3D canvas (zero React lag)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lb-packet-event', {
          detail: {
            serverId: selectedServer.id,
            clientIp: mockReq.clientIp,
            isSuccess,
            latency,
            publicIp: selectedServer.publicIp || selectedServer.ip,
            privateIp: selectedServer.privateIp,
            timestamp: Date.now()
          }
        })
      );
    }

    this.requestsThisSecond++;
    this.latencySamplesThisSecond.push(latency);

    // Update server counters in state
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
      }),
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
        })
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

    const updatedServers = store.clusterMode === 'live' && BASE_URL
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

    // Merge buffered pending logs into state at once
    let newLogs = store.requestLogs;
    if (this.pendingLogs.length > 0) {
      newLogs = [...this.pendingLogs, ...store.requestLogs].slice(0, 200);
      this.pendingLogs = [];
    }

    useSimulationStore.setState((state) => ({
      servers: updatedServers,
      trafficHistory: newHistory,
      requestLogs: newLogs,
      metrics: {
        ...state.metrics,
        currentRps: rps,
        avgLatency: state.clusterMode === 'live' && BASE_URL
          ? state.metrics.avgLatency
          : Math.round(state.metrics.avgLatency * 0.7 + avgSecLatency * 0.3),
        peakRps: Math.max(state.metrics.peakRps, rps),
        activeConnectionsTotal: updatedServers.reduce((sum, s) => sum + (s.activeConnections || 0), 0)
      }
    }));
  }
}

export const simulationEngine = new SimulationEngine();
