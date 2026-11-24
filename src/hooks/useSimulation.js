import { useEffect } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { simulationEngine } from '../simulation/engine';

export function useSimulation() {
  const isRunning = useSimulationStore((state) => state.isRunning);
  const clusterMode = useSimulationStore((state) => state.clusterMode);
  const targetRps = useSimulationStore((state) => state.targetRps);
  const algorithm = useSimulationStore((state) => state.algorithm);
  const metrics = useSimulationStore((state) => state.metrics);
  const events = useSimulationStore((state) => state.events);
  const toggleSimulation = useSimulationStore((state) => state.toggleSimulation);
  const setClusterMode = useSimulationStore((state) => state.setClusterMode);
  const toggleClusterMode = useSimulationStore((state) => state.toggleClusterMode);
  const setTargetRps = useSimulationStore((state) => state.setTargetRps);
  const setAlgorithm = useSimulationStore((state) => state.setAlgorithm);
  const resetSimulation = useSimulationStore((state) => state.resetSimulation);
  const triggerTrafficSpike = useSimulationStore((state) => state.triggerTrafficSpike);

  // Auto-start simulation engine on mount
  useEffect(() => {
    simulationEngine.start();
    return () => {
      // Keep running across view switches or teardown when unmounted completely
    };
  }, []);

  return {
    isRunning,
    clusterMode,
    targetRps,
    algorithm,
    metrics,
    events,
    toggleSimulation,
    setClusterMode,
    toggleClusterMode,
    setTargetRps,
    setAlgorithm,
    resetSimulation,
    triggerTrafficSpike
  };
}
