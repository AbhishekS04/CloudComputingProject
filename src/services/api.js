import { useSimulationStore } from '../store/simulationStore';

/**
 * API Service Layer for future backend integration.
 * By default runs in simulated/mock mode seamlessly, but is ready to swap
 * with real REST endpoints by setting VITE_API_BASE_URL.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || null;

export const apiService = {
  async fetchServers() {
    if (!BASE_URL) {
      return Promise.resolve(useSimulationStore.getState().servers);
    }
    const res = await fetch(`${BASE_URL}/api/servers`);
    return res.json();
  },

  async fetchMetrics() {
    if (!BASE_URL) {
      return Promise.resolve(useSimulationStore.getState().metrics);
    }
    const res = await fetch(`${BASE_URL}/api/metrics`);
    return res.json();
  },

  async startSimulation() {
    if (!BASE_URL) {
      useSimulationStore.getState().setIsRunning(true);
      return Promise.resolve({ status: 'running' });
    }
    const res = await fetch(`${BASE_URL}/api/lb/toggle`, { method: 'POST' });
    return res.json();
  },

  async stopSimulation() {
    if (!BASE_URL) {
      useSimulationStore.getState().setIsRunning(false);
      return Promise.resolve({ status: 'paused' });
    }
    const res = await fetch(`${BASE_URL}/api/lb/toggle`, { method: 'POST' });
    return res.json();
  },

  async sendTrafficConfig(config) {
    if (!BASE_URL) {
      if (config.targetRps) useSimulationStore.getState().setTargetRps(config.targetRps);
      if (config.algorithm) useSimulationStore.getState().setAlgorithm(config.algorithm);
      return Promise.resolve({ success: true, config });
    }
    const res = await fetch(`${BASE_URL}/api/simulation/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  async fetchRequestLogs(limit = 100) {
    if (!BASE_URL) {
      return Promise.resolve(useSimulationStore.getState().requestLogs.slice(0, limit));
    }
    const res = await fetch(`${BASE_URL}/api/logs?limit=${limit}`);
    return res.json();
  },

  async addServer(serverData) {
    if (!BASE_URL) {
      useSimulationStore.getState().addServer(serverData);
      return Promise.resolve({ success: true });
    }
    const res = await fetch(`${BASE_URL}/api/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverData)
    });
    return res.json();
  },

  async removeServer(serverId) {
    if (!BASE_URL) {
      useSimulationStore.getState().removeServer(serverId);
      return Promise.resolve({ success: true });
    }
    const res = await fetch(`${BASE_URL}/api/servers/${serverId}`, { method: 'DELETE' });
    return res.json();
  },

  async toggleServer(serverId) {
    if (!BASE_URL) {
      useSimulationStore.getState().toggleServerStatus(serverId);
      return Promise.resolve({ success: true });
    }
    const res = await fetch(`${BASE_URL}/api/servers/${serverId}/toggle`, { method: 'POST' });
    return res.json();
  }
};


