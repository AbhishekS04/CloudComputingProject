import { useSimulationStore } from '../store/simulationStore';
import { getGatewayUrl } from '../lib/gatewayConfig';

/**
 * API Service Layer for live Azure Load Balancer REST communication.
 */
export const apiService = {
  async fetchServers() {
    const baseUrl = getGatewayUrl();
    if (!baseUrl) {
      return Promise.resolve(useSimulationStore.getState().servers);
    }
    const res = await fetch(`${baseUrl}/api/servers`);
    return res.json();
  },

  async fetchMetrics() {
    const baseUrl = getGatewayUrl();
    if (!baseUrl) {
      return Promise.resolve(useSimulationStore.getState().metrics);
    }
    const res = await fetch(`${baseUrl}/api/metrics`);
    return res.json();
  },

  async startSimulation() {
    const baseUrl = getGatewayUrl();
    if (!baseUrl) {
      useSimulationStore.getState().setIsRunning(true);
      return Promise.resolve({ status: 'running' });
    }
    const res = await fetch(`${baseUrl}/api/lb/toggle`, { method: 'POST' });
    return res.json();
  },

  async stopSimulation() {
    const baseUrl = getGatewayUrl();
    if (!baseUrl) {
      useSimulationStore.getState().setIsRunning(false);
      return Promise.resolve({ status: 'paused' });
    }
    const res = await fetch(`${baseUrl}/api/lb/toggle`, { method: 'POST' });
    return res.json();
  },

  async sendTrafficConfig(config) {
    const baseUrl = getGatewayUrl();
    if (!baseUrl) {
      if (config.targetRps) useSimulationStore.getState().setTargetRps(config.targetRps);
      if (config.algorithm) useSimulationStore.getState().setAlgorithm(config.algorithm);
      return Promise.resolve({ success: true, config });
    }
    const res = await fetch(`${baseUrl}/api/simulation/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  async fetchRequestLogs(limit = 100) {
    const baseUrl = getGatewayUrl();
    if (!baseUrl) {
      return Promise.resolve(useSimulationStore.getState().requestLogs.slice(0, limit));
    }
    const res = await fetch(`${baseUrl}/api/logs?limit=${limit}`);
    return res.json();
  },

  async addServer(serverData) {
    const baseUrl = getGatewayUrl();
    if (!baseUrl) {
      useSimulationStore.getState().addServer(serverData);
      return Promise.resolve({ success: true });
    }
    const res = await fetch(`${baseUrl}/api/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverData)
    });
    return res.json();
  },

  async removeServer(serverId) {
    const baseUrl = getGatewayUrl();
    if (!baseUrl) {
      useSimulationStore.getState().removeServer(serverId);
      return Promise.resolve({ success: true });
    }
    const res = await fetch(`${baseUrl}/api/servers/${serverId}`, { method: 'DELETE' });
    return res.json();
  },

  async toggleServer(serverId) {
    const baseUrl = getGatewayUrl();
    if (!baseUrl) {
      useSimulationStore.getState().toggleServerStatus(serverId);
      return Promise.resolve({ success: true });
    }
    const res = await fetch(`${baseUrl}/api/servers/${serverId}/toggle`, { method: 'POST' });
    return res.json();
  }
};
