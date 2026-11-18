import { useSimulationStore } from '../store/simulationStore';

export function useTraffic() {
  const trafficHistory = useSimulationStore((state) => state.trafficHistory);
  const requestLogs = useSimulationStore((state) => state.requestLogs);
  const activePackets = useSimulationStore((state) => state.activePackets);
  const metrics = useSimulationStore((state) => state.metrics);
  const clearLogs = useSimulationStore((state) => state.clearLogs);

  return {
    trafficHistory,
    requestLogs,
    activePackets,
    metrics,
    clearLogs
  };
}
