import { useSimulationStore } from '../store/simulationStore';

export function useServers() {
  const servers = useSimulationStore((state) => state.servers);
  const addServer = useSimulationStore((state) => state.addServer);
  const removeServer = useSimulationStore((state) => state.removeServer);
  const toggleServerStatus = useSimulationStore((state) => state.toggleServerStatus);
  const failServer = useSimulationStore((state) => state.failServer);
  const recoverServer = useSimulationStore((state) => state.recoverServer);
  const updateServerWeight = useSimulationStore((state) => state.updateServerWeight);
  const selectedNode = useSimulationStore((state) => state.selectedNode);
  const setSelectedNode = useSimulationStore((state) => state.setSelectedNode);

  const healthyServers = servers.filter((s) => s.status === 'healthy');
  const degradedServers = servers.filter((s) => s.status === 'degraded');
  const failedServers = servers.filter((s) => s.status === 'failed' || s.status === 'disabled');

  return {
    servers,
    healthyServers,
    degradedServers,
    failedServers,
    totalServers: servers.length,
    activeServersCount: healthyServers.length + degradedServers.length,
    addServer,
    removeServer,
    toggleServerStatus,
    failServer,
    recoverServer,
    updateServerWeight,
    selectedNode,
    setSelectedNode
  };
}
