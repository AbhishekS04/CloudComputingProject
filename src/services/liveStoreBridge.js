import { useSimulationStore } from '../store/simulationStore';
import { simulationEngine } from '../simulation/engine';
import { getGatewayUrl } from '../lib/gatewayConfig';

const ALGO_UI_TO_STORE = {
  'ROUND ROBIN': 'ROUND_ROBIN',
  'LEAST CONN': 'LEAST_CONNECTIONS',
  'IP HASH': 'IP_HASH',
  'RANDOM': 'RANDOM',
  'WEIGHTED RR': 'WEIGHTED_ROUND_ROBIN',
};

const ALGO_STORE_TO_UI = {
  ROUND_ROBIN: 'ROUND ROBIN',
  LEAST_CONNECTIONS: 'LEAST CONN',
  IP_HASH: 'IP HASH',
  RANDOM: 'RANDOM',
  WEIGHTED_ROUND_ROBIN: 'WEIGHTED RR',
};

export function initLiveStoreBridge() {
  if (!getGatewayUrl() || typeof window === 'undefined') return;

  const broadcastState = () => {
    const state = useSimulationStore.getState();
    const mappedServers = state.servers.map((s, idx) => ({
      id: s.id,
      name: s.name || `Azure VM ${idx + 1}`,
      ip: s.publicIp || s.ip || (s.url ? s.url.replace(/^https?:\/\//, "") : "52.172.229.225:5001"),
      publicIp: s.publicIp || s.ip || "52.172.229.225:5001",
      privateIp: s.privateIp || `10.0.1.${10 + idx}`,
      cpu: Math.round(s.cpuUsage ?? s.cpu ?? 25),
      connections: s.activeConnections ?? s.connections ?? 0,
      healthy: s.status === 'healthy' || s.healthy === true,
    }));

    const mappedClients = state.clients.slice(0, 6).map((c, idx) => ({
      id: c.id || `client-${idx + 1}`,
      label: c.name || `Client ${idx + 1}`,
      ip: c.ip || `198.51.100.${10 + idx}`,
      region: c.region || 'Global',
      dashed: idx % 2 === 1,
      type: idx % 3 === 1 ? 'mobile' : 'laptop',
    }));

    const detail = {
      clients: mappedClients,
      servers: mappedServers,
      algorithm: ALGO_STORE_TO_UI[state.algorithm] || state.algorithm,
      targetRps: state.targetRps,
      isPaused: !state.isRunning,
      lbOnline: state.lbOnline,
      metrics: {
        dns: 12,
        lb: Math.max(4, Math.round((state.metrics.avgLatency || 24) * 0.25)),
        server: Math.max(10, Math.round((state.metrics.avgLatency || 24) * 0.75)),
        throughput: state.metrics.currentRps || state.targetRps,
        totalRtt: Math.round(state.metrics.avgLatency || 24),
      },
    };

    window.dispatchEvent(new CustomEvent('lb-visualizer-state', { detail }));
    return detail;
  };

  const installLiveController = () => {
    const existing = window.LoadBalancerVisualizer || {};
    window.LoadBalancerVisualizer = {
      ...existing,
      getState: broadcastState,
      togglePause: () => {
        const nextPaused = useSimulationStore.getState().isRunning;
        fetch(`${getGatewayUrl()}/api/lb/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paused: nextPaused })
        }).catch(() => {});
        useSimulationStore.getState().toggleSimulation();
        broadcastState();
      },
      setPaused: (paused) => {
        fetch(`${getGatewayUrl()}/api/lb/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paused: Boolean(paused) }) }).catch(() => {});
        const s = useSimulationStore.getState();
        if (s.isRunning === Boolean(paused)) s.toggleSimulation();
        broadcastState();
      },
      setAlgorithm: (algo) => {
        const normalized = ALGO_UI_TO_STORE[algo] || algo;
        useSimulationStore.getState().setAlgorithm(normalized);
        broadcastState();
      },
      cycleAlgorithm: () => {
        const order = ['ROUND_ROBIN', 'LEAST_CONNECTIONS', 'IP_HASH', 'RANDOM', 'WEIGHTED_ROUND_ROBIN'];
        const curr = useSimulationStore.getState().algorithm;
        const next = order[(order.indexOf(curr) + 1) % order.length];
        useSimulationStore.getState().setAlgorithm(next);
        broadcastState();
      },
      setRequestRate: (rps) => {
        useSimulationStore.getState().setTargetRps(Number(rps));
        broadcastState();
      },
      setTargetRps: (rps) => {
        useSimulationStore.getState().setTargetRps(Number(rps));
        broadcastState();
      },
      toggleServer: (indexOrId) => {
        const srvs = useSimulationStore.getState().servers;
        const target = typeof indexOrId === 'number' ? srvs[indexOrId] : srvs.find((s) => s.id === indexOrId);
        if (target) {
          useSimulationStore.getState().toggleServerStatus(target.id);
          broadcastState();
        }
      },
      addServer: () => {
        useSimulationStore.getState().addServer();
        broadcastState();
      },
      removeServer: () => {
        const srvs = useSimulationStore.getState().servers;
        if (srvs.length > 1) {
          useSimulationStore.getState().removeServer(srvs[srvs.length - 1].id);
          broadcastState();
        }
      },
      addClient: () => {
        const state = useSimulationStore.getState();
        const nextIdx = state.clients.length + 1;
        useSimulationStore.setState({
          clients: [
            ...state.clients,
            { id: `client-${Date.now()}`, name: `Client ${nextIdx}`, ip: `198.51.100.${10 + nextIdx}`, region: 'Global' },
          ],
        });
        broadcastState();
      },
      removeClient: () => {
        const state = useSimulationStore.getState();
        if (state.clients.length > 1) {
          useSimulationStore.setState({ clients: state.clients.slice(0, -1) });
          broadcastState();
        }
      },
      triggerBurstWave: () => {
        for (let i = 0; i < 20; i++) {
          setTimeout(() => simulationEngine.dispatchRealRequest(), i * 25);
        }
      },
      burstWave: () => {
        for (let i = 0; i < 20; i++) {
          setTimeout(() => simulationEngine.dispatchRealRequest(), i * 25);
        }
      },
      triggerRequest: () => {
        simulationEngine.dispatchRealRequest();
      },
    };
  };

  installLiveController();
  const unsub = useSimulationStore.subscribe(() => {
    installLiveController();
    broadcastState();
  });

  const interval = setInterval(() => {
    installLiveController();
    broadcastState();
  }, 300);

  return () => {
    unsub();
    clearInterval(interval);
  };
}



