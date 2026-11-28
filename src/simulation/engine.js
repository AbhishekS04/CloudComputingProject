import { useSimulationStore } from '../store/simulationStore';
import { generateMockRequest } from './trafficGenerator';
import { algorithmManager } from './loadBalancingAlgorithms';
import { calculateServerLatency } from '../utils/calculations';
import { getGatewayUrl, getGatewayHost, getVmBaseUrl, subscribeGatewayChange } from '../lib/gatewayConfig';

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
    this.eventRetryTimer = null;
    this.bridgeSource = null;
    this.isSyncing = false;
    this.lastBridgeEventAt = 0;
    this.tickRate = 120; // 120ms per engine tick
    this.accumulator = 0;
    this.requestsThisSecond = 0;
    this.latencySamplesThisSecond = [];
    this.lastSecondTime = Date.now();
    this.pendingLogs = [];
    this.pendingServerDeltas = {};
    this.pendingMetricDelta = { total: 0, ok: 0, fail: 0, latency: null, exec: null, disp: null };
    this.deltaFlushTimer = null;
    this.seenRequestIds = new Set();
    this.unsubscribeGateway = null;
    this.syncFailCount = 0;        // consecutive /api/servers sync failure counter
    this.lbProbeFailCount = 0;     // consecutive /gateway-health probe failure counter
    this.vmFailCounts = {};        // consecutive direct/Rust health probe failure counter per VM id
    this.isProbing = false;
    this.probeIntervalId = null;
    this.localProbeUnavailable = false;
    this.OFFLINE_THRESHOLD = 2;    // mark offline after 2 consecutive failures (~4-5s)
    this.syncEpoch = 0;
    this.lastRawBackendStats = null;
    this.runBaseline = null;
    this.hasInitialBaseline = false;
  }

  /**
   * Resets visible run counters to 0 and snapshots the remote LB cumulative totals
   * as a baseline so consecutive runs (e.g. 2k -> 2k) each report only fresh requests.
   */
  async startFreshRun({ fetchRemoteBaseline = true } = {}) {
    this.syncEpoch += 1;
    if (this.deltaFlushTimer) {
      clearTimeout(this.deltaFlushTimer);
      this.deltaFlushTimer = null;
    }
    this.pendingLogs = [];
    this.pendingServerDeltas = {};
    this.pendingMetricDelta = { total: 0, ok: 0, fail: 0, latency: null, exec: null, disp: null };

    const zeroStoreCounters = () => {
      useSimulationStore.setState((state) => ({
        servers: state.servers.map((s) => ({
          ...s,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
        })),
        metrics: {
          ...state.metrics,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          currentRps: 0,
        },
      }));
    };

    zeroStoreCounters();

    const store = useSimulationStore.getState();
    const baseUrl = getGatewayUrl();
    if (store.clusterMode !== 'live' || !baseUrl) {
      this.runBaseline = null;
      return;
    }

    if (this.lastRawBackendStats) {
      this.runBaseline = {
        total: this.lastRawBackendStats.total,
        ok: this.lastRawBackendStats.ok,
        fail: this.lastRawBackendStats.fail,
        servers: { ...this.lastRawBackendStats.servers },
      };
    }

    if (!fetchRemoteBaseline) return;

    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(`${baseUrl}/api/stats`, { cache: 'no-store', signal: ctrl.signal });
      if (res.ok) {
        const statsData = await res.json();
        const srvMap = {};
        if (Array.isArray(statsData?.servers)) {
          for (const srv of statsData.servers) {
            srvMap[srv.id] = {
              total: srv.total_requests || 0,
              failed: srv.failed_requests || 0,
            };
          }
        }
        const snap = {
          total: statsData?.total_requests ?? 0,
          ok: statsData?.successful_requests ?? 0,
          fail: statsData?.failed_requests ?? 0,
          servers: srvMap,
        };
        this.lastRawBackendStats = snap;
        this.runBaseline = snap;
        this.hasInitialBaseline = true;
        // Re-zero in case any tick flushed while awaiting /api/stats baseline
        zeroStoreCounters();
      }
    } catch {
      // Keep lastRawBackendStats fallback baseline if gateway probe is busy
    } finally {
      clearTimeout(tid);
    }
  }

  start() {
    if (this.intervalId) return;
    this.lastSecondTime = Date.now();

    this.syncFromBackend();
    this.probeClusterHealth();
    this.syncIntervalId = setInterval(() => this.syncFromBackend(), 2500);
    this.probeIntervalId = setInterval(() => this.probeClusterHealth(), 2500);
    this.initEventStream();
    this.initBridgeStream();
    if (!this.unsubscribeGateway) {
      this.unsubscribeGateway = subscribeGatewayChange(() => {
        this.syncFailCount = 0;
        this.lbProbeFailCount = 0;
        this.vmFailCounts = {};
        this.runBaseline = null;
        this.hasInitialBaseline = false;
        this.initEventStream();
        this.syncFromBackend();
        this.probeClusterHealth();
      });
    }

    this.intervalId = setInterval(() => this.tick(), this.tickRate);
  }

  stop() {
    if (this.unsubscribeGateway) {
      this.unsubscribeGateway();
      this.unsubscribeGateway = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    if (this.probeIntervalId) {
      clearInterval(this.probeIntervalId);
      this.probeIntervalId = null;
    }
    if (this.eventRetryTimer) {
      clearTimeout(this.eventRetryTimer);
      this.eventRetryTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.bridgeSource) {
      this.bridgeSource.close();
      this.bridgeSource = null;
    }
    if (this.deltaFlushTimer) {
      clearTimeout(this.deltaFlushTimer);
      this.deltaFlushTimer = null;
    }
  }

  initBridgeStream() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) return;
    if (this.bridgeSource) {
      this.bridgeSource.close();
      this.bridgeSource = null;
    }
    try {
      this.bridgeSource = new EventSource('/__bridge/stream');
      this.bridgeSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          this.lastBridgeEventAt = Date.now();
          if (data.type === 'request') {
            this.handleLiveRequestEvent(data);
            if (data.crashed && data.selected_server) {
              useSimulationStore.setState((state) => ({
                servers: state.servers.map((s) =>
                  s.id === data.selected_server
                    ? { ...s, status: 'failed', activeConnections: 0, cpu: 0 }
                    : s
                )
              }));
            }
          } else if (data.type === 'server_update') {
            if (data.action === 'crash' && data.server_id) {
              useSimulationStore.setState((state) => ({
                servers: state.servers.map((s) =>
                  s.id === data.server_id
                    ? { ...s, status: 'failed', activeConnections: 0, cpu: 0 }
                    : s
                )
              }));
            } else if (data.action === 'recover') {
              useSimulationStore.setState((state) => ({
                servers: state.servers.map((s) => ({
                  ...s,
                  status: 'healthy',
                  activeConnections: 0,
                  cpu: 22
                }))
              }));
            }
          }
        } catch {
          // ignore parse error
        }
      };
    } catch {
      // ignore if EventSource unavailable
    }
  }

  initEventStream() {
    if (typeof window === 'undefined') return;
    const url = getGatewayUrl() || '';
    if (this.eventRetryTimer) {
      clearTimeout(this.eventRetryTimer);
      this.eventRetryTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Serverless HTTPS proxy routes (/lb-api) cannot hold infinite idle SSE streams
    // cleanly; live updates are handled by syncFromBackend() + direct sendOne() responses.
    if (!url || url.startsWith('/')) return;

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
            useSimulationStore.setState((state) => ({
              lbPaused: data.paused,
              ...(state.clusterMode === 'live' ? { isRunning: !data.paused } : {}),
            }));
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
        this.eventRetryTimer = setTimeout(() => {
          this.eventRetryTimer = null;
          if (!this.eventSource && this.intervalId) {
            this.initEventStream();
          }
        }, 3000);
      };
    } catch {
      // EventSource not supported
    }
  }

  handleLiveRequestEvent(data) {
    if (data?.request_id) {
      if (this.seenRequestIds.has(data.request_id)) return;
      this.seenRequestIds.add(data.request_id);
      if (this.seenRequestIds.size > 600) {
        const first = this.seenRequestIds.values().next().value;
        this.seenRequestIds.delete(first);
      }
    }
    const store = useSimulationStore.getState();
    const isSuccess = data.status === 'success';
    const latency = Math.round(data.response_time_ms || 25);
    const serverId = data.selected_server;

    this.requestsThisSecond++;
    if (isSuccess) {
      this.latencySamplesThisSecond.push(latency);
    }

    // 1. Dispatch lightweight visual event for 2D & 3D visualizers (0 React re-renders, 60 FPS)
    // 1. Dispatch lightweight visual event immediately for 2D & 3D SVG loops (0 React re-renders, 60-120 FPS)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lb-packet-event', {
          detail: {
            serverId,
            clientIp: data.client_ip || '198.51.100.4',
            isSuccess,
            directNoLb: Boolean(data.direct_no_lb),
            latency,
            publicIp: data.public_ip,
            privateIp: data.private_ip,
            timestamp: Date.now()
          }
        })
      );
    }

    // Batch Zustand state updates (prevents 60Hz React/Recharts re-render stutter under high concurrency)
    const key = serverId || data.public_ip || 'unknown';
    const prevD = this.pendingServerDeltas[key] || {
      serverId,
      publicIp: data.public_ip,
      total: 0,
      ok: 0,
      fail: 0,
      latencySum: 0,
      latencyCount: 0,
      directNoLb: false,
      crashed: false
    };
    prevD.total += 1;
    if (isSuccess) {
      prevD.ok += 1;
      prevD.latencySum += latency;
      prevD.latencyCount += 1;
    } else {
      prevD.fail += 1;
    }
    if (data.direct_no_lb) prevD.directNoLb = true;
    if (data.crashed) prevD.crashed = true;
    this.pendingServerDeltas[key] = prevD;

    this.pendingMetricDelta.total += 1;
    if (isSuccess) {
      this.pendingMetricDelta.ok += 1;
      this.pendingMetricDelta.latency = latency;
    } else {
      this.pendingMetricDelta.fail += 1;
    }
    if (data.server_exec_ms !== undefined) {
      this.pendingMetricDelta.exec = Math.round(data.server_exec_ms);
    }
    if (data.direct_no_lb) {
      this.pendingMetricDelta.disp = 0;
    } else if (data.lb_dispatch_ms !== undefined) {
      this.pendingMetricDelta.disp = Math.max(1, Math.round(data.lb_dispatch_ms));
    }

    if (data.crashed) {
      this.flushPendingStoreDeltas();
    } else if (!this.deltaFlushTimer) {
      this.deltaFlushTimer = setTimeout(() => {
        this.deltaFlushTimer = null;
        this.flushPendingStoreDeltas();
      }, 160);
    }

    // 2. Buffer log for non-blocking periodic flush
    const targetServer = store.servers.find((s) => s.id === serverId) || {
      id: serverId,
      name: serverId,
      ip: data.public_ip || serverId
    };

    const newLog = {
      id: data.request_id || `req-${Date.now()}`,
      timestamp: Date.now(),
      client: { id: 'browser-client', name: 'Browser Client', ip: data.client_ip || '198.51.100.4' },
      server: targetServer,
      serverName: `${targetServer.name || serverId} (${data.public_ip || targetServer.ip || 'Azure VM'})`,
      endpoint: data.direct_no_lb
        ? '/api/process (Direct No-LB)'
        : (data.failover_from ? `/api/process (Failover from ${data.failover_from})` : '/api/process'),
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

  flushPendingStoreDeltas() {
    const serverDeltas = Object.values(this.pendingServerDeltas);
    const mDelta = this.pendingMetricDelta;
    if (serverDeltas.length === 0 && mDelta.total === 0) return;

    this.pendingServerDeltas = {};
    this.pendingMetricDelta = { total: 0, ok: 0, fail: 0, latency: null, exec: null, disp: null };

    useSimulationStore.setState((state) => ({
      servers: state.servers.map((s) => {
        const d = serverDeltas.find(
          (item) =>
            s.id === item.serverId ||
            s.name === item.serverId ||
            s.host === item.serverId ||
            (item.publicIp && s.publicIp && s.publicIp.includes(item.publicIp))
        );
        if (!d) return s;
        const avgSample = d.latencyCount > 0 ? Math.round(d.latencySum / d.latencyCount) : s.avgLatency;
        const cpuBump = d.crashed
          ? 0
          : d.directNoLb
            ? Math.min(99, (s.cpu || 30) + Math.min(35, d.ok * 8))
            : Math.min(96, Math.max(18, (s.cpu || 25) + Math.min(20, d.total * 2)));
        return {
          ...s,
          status: d.crashed ? 'failed' : s.status,
          activeConnections: d.crashed ? 0 : Math.min(28, d.total),
          cpu: cpuBump,
          totalRequests: (s.totalRequests || 0) + d.total,
          successfulRequests: (s.successfulRequests || 0) + d.ok,
          failedRequests: (s.failedRequests || 0) + d.fail,
          avgLatency: s.avgLatency && avgSample ? Math.round((s.avgLatency * 3 + avgSample) / 4) : (avgSample || s.avgLatency)
        };
      }),
      metrics: {
        ...state.metrics,
        totalRequests: (state.metrics.totalRequests || 0) + mDelta.total,
        successfulRequests: (state.metrics.successfulRequests || 0) + mDelta.ok,
        failedRequests: (state.metrics.failedRequests || 0) + mDelta.fail,
        avgLatency: mDelta.latency !== null ? mDelta.latency : state.metrics.avgLatency,
        serverExec: mDelta.exec !== null ? mDelta.exec : state.metrics.serverExec,
        lbDispatch: mDelta.disp !== null ? mDelta.disp : state.metrics.lbDispatch
      }
    }));
  }

  markLbOfflineState() {
    const bridgeActive = Date.now() - (this.lastBridgeEventAt || 0) < 2500;
    useSimulationStore.setState((state) => ({
      lbOnline: false,
      servers: bridgeActive
        ? state.servers
        : state.servers.map((s) => ({
            ...s,
            activeConnections: 0,
            cpu: s.status === 'healthy' ? Math.max(12, Math.min(25, s.cpu || 18)) : 0
          })),
      metrics: {
        ...state.metrics,
        currentRps: bridgeActive ? state.metrics.currentRps : 0,
        activeConnectionsTotal: bridgeActive ? state.metrics.activeConnectionsTotal : 0
      }
    }));
  }

  async syncFromBackend() {
    const store = useSimulationStore.getState();
    const baseUrl = getGatewayUrl();
    if (store.clusterMode !== 'live') {
      this.runBaseline = null;
      this.hasInitialBaseline = false;
      return;
    }
    if (!baseUrl || this.isSyncing) return;

    this.isSyncing = true;
    const callEpoch = this.syncEpoch;
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 5500);

    try {
      const [serversRes, statsRes] = await Promise.all([
        fetch(`${baseUrl}/api/servers`, { cache: 'no-store', signal: ctrl.signal }),
        fetch(`${baseUrl}/api/stats`, { cache: 'no-store', signal: ctrl.signal })
      ]);
      if (!serversRes.ok || !statsRes.ok) {
        this.syncFailCount = (this.syncFailCount || 0) + 1;
        if (this.syncFailCount >= this.OFFLINE_THRESHOLD) {
          this.markLbOfflineState();
        }
        return;
      }

      // Discard stale poll that started before a fresh run baseline reset
      if (callEpoch !== this.syncEpoch) return;

      // Success — reset failure counters immediately
      this.syncFailCount = 0;
      this.lbProbeFailCount = 0;
      const wasLbOffline = !useSimulationStore.getState().lbOnline;
      if (wasLbOffline && !this.eventSource && !baseUrl.startsWith('/')) {
        this.initEventStream();
      }

      const serversData = await serversRes.json();
      const statsData = await statsRes.json();
      if (callEpoch !== this.syncEpoch) return;

      const rawServers = Array.isArray(serversData) ? serversData : (serversData.servers || []);
      const rawTotal = statsData.total_requests ?? 0;
      const rawOk = statsData.successful_requests ?? 0;
      const rawFail = statsData.failed_requests ?? 0;

      const rawServerMap = {};
      for (const srv of rawServers) {
        rawServerMap[srv.id] = {
          total: srv.total_requests || 0,
          failed: srv.failed_requests || 0,
        };
      }
      this.lastRawBackendStats = {
        total: rawTotal,
        ok: rawOk,
        fail: rawFail,
        servers: rawServerMap,
      };

      // On initial page load / refresh (or gateway switch), baseline from Azure's existing total so session starts at 0
      if (!this.hasInitialBaseline && !this.runBaseline) {
        this.runBaseline = {
          total: rawTotal,
          ok: rawOk,
          fail: rawFail,
          servers: rawServerMap,
        };
        this.hasInitialBaseline = true;
      } else if (this.runBaseline && rawTotal < this.runBaseline.total) {
        // If remote LB restarted and cumulative total dropped below baseline, re-anchor at current total
        this.runBaseline = {
          total: rawTotal,
          ok: rawOk,
          fail: rawFail,
          servers: rawServerMap,
        };
      }

      const base = this.runBaseline;
      const relTotal = base ? Math.max(0, rawTotal - base.total) : rawTotal;
      const relOk = base ? Math.max(0, rawOk - base.ok) : rawOk;
      const relFail = base ? Math.max(0, rawFail - base.fail) : rawFail;

      const backendAlgoRaw = String(statsData?.algorithm || '').toUpperCase();
      const validBackendAlgo = ['ROUND_ROBIN', 'LEAST_CONNECTIONS', 'IP_HASH'].includes(backendAlgoRaw)
        ? backendAlgoRaw
        : null;

      useSimulationStore.setState((state) => {
        if (state.clusterMode !== 'live') return state;
        const existingMap = Object.fromEntries(state.servers.map((s) => [s.id, s]));
        const mappedServers = rawServers.map((srv, idx) => {
          const mapped = mapBackendServer(srv, idx, existingMap[srv.id]);
          const srvBase = base?.servers?.[srv.id];
          const adjTotal = srvBase ? Math.max(0, (srv.total_requests || 0) - srvBase.total) : mapped.totalRequests;
          const adjFail = srvBase ? Math.max(0, (srv.failed_requests || 0) - srvBase.failed) : mapped.failedRequests;
          const adjOk = Math.max(0, adjTotal - adjFail);
          const withRunCounts = {
            ...mapped,
            totalRequests: adjTotal,
            successfulRequests: adjOk,
            failedRequests: adjFail,
          };
          if (withRunCounts.status === 'healthy' && (this.vmFailCounts[withRunCounts.id] || 0) >= this.OFFLINE_THRESHOLD) {
            return { ...withRunCounts, status: 'failed', activeConnections: 0, cpu: 0 };
          }
          return withRunCounts;
        });

        return {
          lbOnline: true,
          lbPaused: Boolean(statsData?.lb_paused),
          ...(validBackendAlgo ? { algorithm: validBackendAlgo } : {}),
          servers: mappedServers,
          metrics: {
            ...state.metrics,
            totalRequests: statsData.total_requests !== undefined ? relTotal : state.metrics.totalRequests,
            successfulRequests: statsData.successful_requests !== undefined ? relOk : state.metrics.successfulRequests,
            failedRequests: statsData.failed_requests !== undefined ? relFail : state.metrics.failedRequests,
            avgLatency: Math.round(statsData.avg_response_time_ms || state.metrics.avgLatency),
            activeConnectionsTotal: statsData.active_connections ?? state.metrics.activeConnectionsTotal
          }
        };
      });
    } catch {
      this.syncFailCount = (this.syncFailCount || 0) + 1;
      if (this.syncFailCount >= this.OFFLINE_THRESHOLD) {
        this.markLbOfflineState();
      }
    } finally {
      clearTimeout(timeoutId);
      this.isSyncing = false;
    }
  }

  /**
   * Continuous independent Azure health probe (Rust bifrost-probe in dev, or direct /gateway-health + /vm-api/:id/health).
   * Ensures both backend VMs and the LB-VM accurately reflect ON/OFF state if shut down from Azure Portal.
   */
  async probeClusterHealth() {
    const store = useSimulationStore.getState();
    const baseUrl = getGatewayUrl();
    if (store.clusterMode !== 'live' || !baseUrl || this.isProbing) return;

    this.isProbing = true;
    try {
      const host = getGatewayHost(baseUrl);
      const isDefaultAzure = baseUrl === '/lb-api' || host === '20.244.34.101:5000';

      if (typeof window !== 'undefined' && isDefaultAzure && !this.localProbeUnavailable) {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 3200);
        try {
          const res = await fetch('/__probe/cluster-health', { cache: 'no-store', signal: ctrl.signal });
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            const snap = await res.json();
            if (snap && Array.isArray(snap.servers)) {
              this.applyClusterProbeSnapshot({
                lbOnline: snap.lb ? Boolean(snap.lb.online) : null,
                lbPaused: snap.lb ? Boolean(snap.lb.paused) : null,
                servers: snap.servers,
              });
              return;
            }
          }
          // Non-JSON (e.g. SPA HTML rewrite on Vercel) or 404: disable local dev probe endpoint
          this.localProbeUnavailable = true;
        } catch {
          // Fall back to HTTP probe below if dev bridge endpoint is unavailable
        } finally {
          clearTimeout(tid);
        }
      }

      // Production / HTTPS proxy / custom gateway probe
      const useLocalProxy =
        typeof window !== 'undefined' &&
        (window.location?.protocol === 'https:' || import.meta.env.DEV);

      const probeTarget = async (url) => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 3000);
        try {
          const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
          const ct = res.headers.get('content-type') || '';
          if (res.status === 404 || ct.includes('text/html')) {
            return { known: false };
          }
          const body = ct.includes('application/json') ? await res.json().catch(() => ({})) : {};
          return {
            known: true,
            ok: res.ok,
            paused: Boolean(body?.paused || body?.status === 'paused'),
          };
        } catch {
          return { known: true, ok: false, paused: false };
        } finally {
          clearTimeout(tid);
        }
      };

      const lbPromise = probeTarget(`${baseUrl}/gateway-health`);
      const vmPromises = (isDefaultAzure ? store.servers : []).map(async (srv) => {
        const vmUrl =
          useLocalProxy && ['server-1', 'server-2', 'server-3'].includes(srv.id)
            ? `/vm-api/${srv.id}/health`
            : `${getVmBaseUrl(srv)}/health`;
        const outcome = await probeTarget(vmUrl);
        return { id: srv.id, ...outcome };
      });

      const [lbResult, ...vmResults] = await Promise.all([lbPromise, ...vmPromises]);
      this.applyClusterProbeSnapshot({
        lbOnline: lbResult.known ? lbResult.ok : null,
        lbPaused: lbResult.known && lbResult.ok ? lbResult.paused : null,
        servers: vmResults
          .filter((r) => r.known)
          .map((r) => ({ id: r.id, healthy: r.ok })),
      });
    } finally {
      this.isProbing = false;
    }
  }

  applyClusterProbeSnapshot({ lbOnline, lbPaused, servers }) {
    const state = useSimulationStore.getState();
    if (state.clusterMode !== 'live') return;

    if (lbOnline === true) {
      this.lbProbeFailCount = 0;
      this.syncFailCount = 0;
      if (!state.lbOnline || (typeof lbPaused === 'boolean' && lbPaused !== state.lbPaused)) {
        useSimulationStore.setState((prev) => ({
          lbOnline: true,
          ...(typeof lbPaused === 'boolean' ? { lbPaused } : {}),
          metrics: prev.metrics,
        }));
      }
    } else if (lbOnline === false) {
      this.lbProbeFailCount = (this.lbProbeFailCount || 0) + 1;
      if (this.lbProbeFailCount >= this.OFFLINE_THRESHOLD && state.lbOnline) {
        this.markLbOfflineState();
      }
    }

    if (!Array.isArray(servers) || servers.length === 0) return;

    const probeMap = {};
    for (const item of servers) {
      if (!item?.id) continue;
      if (item.healthy) {
        this.vmFailCounts[item.id] = 0;
      } else {
        this.vmFailCounts[item.id] = (this.vmFailCounts[item.id] || 0) + 1;
      }
      probeMap[item.id] = item.healthy;
    }

    const latest = useSimulationStore.getState();
    const isLbCurrentlyOnline = latest.lbOnline;
    let changed = false;

    const nextServers = latest.servers.map((srv) => {
      if (!(srv.id in probeMap)) return srv;
      const isUp = probeMap[srv.id];

      if (!isUp) {
        if ((this.vmFailCounts[srv.id] || 0) >= this.OFFLINE_THRESHOLD) {
          // Preserve manual 'disabled' state when LB is online, otherwise reflect unreachable crash
          if (isLbCurrentlyOnline && srv.status === 'disabled') return srv;
          if (srv.status !== 'failed') {
            changed = true;
            return { ...srv, status: 'failed', activeConnections: 0, cpu: 0 };
          }
        }
        return srv;
      }

      // Probe succeeded: when LB is offline, reflect actual VM availability directly
      if (!isLbCurrentlyOnline && srv.status !== 'healthy') {
        changed = true;
        return {
          ...srv,
          status: 'healthy',
          activeConnections: 0,
          cpu: Math.max(12, Math.min(25, srv.cpu || 18)),
        };
      }
      return srv;
    });

    if (changed) {
      useSimulationStore.setState({ servers: nextServers });
    }
  }

  tick() {
    const now = Date.now();
    this.accumulator = 0;

    if (now - this.lastSecondTime >= 1000) {
      this.flushSecondMetrics(now);
      this.lastSecondTime = now;
    }
  }

  /** Update remote LB pause state when live LB traffic responses explicitly report 503 paused or resume with 2xx. */
  syncRemoteLbPausedFromResponse(status, payload, viaLb = true) {
    if (!viaLb) return;
    if (status === 503) {
      const msg = String(payload?.error || payload?.message || payload?.status || '').toLowerCase();
      if (msg.includes('paused')) {
        useSimulationStore.setState({ lbPaused: true });
      }
    } else if (status >= 200 && status < 300 && useSimulationStore.getState().lbPaused) {
      useSimulationStore.setState({ lbPaused: false });
    }
  }

  async dispatchRealRequest() {
    const store = useSimulationStore.getState();
    if (!store.isRunning) return;
    const baseUrl = getGatewayUrl();

    // Sandbox / Dummy mode fallback: dispatch immediately via internal engine
    if (store.clusterMode === 'dummy' || !baseUrl) {
      this.dispatchSingleRequest();
      return;
    }

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 5000);
    try {
      const resp = await fetch(`${baseUrl}/api/request`, {
        signal: ctrl.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        this.syncRemoteLbPausedFromResponse(resp.status, data, true);
        if (data?.selected_server) {
          this.handleLiveRequestEvent({ type: 'request', ...data });
        }
      } else {
        const errData = await resp.json().catch(() => ({}));
        this.syncRemoteLbPausedFromResponse(resp.status, errData, true);
      }
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
    } finally {
      clearTimeout(timeoutId);
    }
  }

  dispatchSingleRequest({ fromTick = false } = {}) {
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
            fromTick,
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

    const baseUrl = getGatewayUrl();
    const updatedServers = store.clusterMode === 'live' && baseUrl
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
        avgLatency: state.clusterMode === 'live' && getGatewayUrl()
          ? state.metrics.avgLatency
          : Math.round(state.metrics.avgLatency * 0.7 + avgSecLatency * 0.3),
        peakRps: Math.max(state.metrics.peakRps, rps),
        activeConnectionsTotal: updatedServers.reduce((sum, s) => sum + (s.activeConnections || 0), 0)
      }
    }));
  }
}

export const simulationEngine = new SimulationEngine();
