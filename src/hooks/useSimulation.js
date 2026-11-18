import { useEffect } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { simulationEngine } from '../simulation/engine';

export function useSimulation() {
  const isRunning = useSimulationStore((state) => state.isRunning);
  const targetRps = useSimulationStore((state) => state.targetRps);
  const algorithm = useSimulationStore((state) => state.algorithm);
  const metrics = useSimulationStore((state) => state.metrics);
  const events = useSimulationStore((state) => state.events);
  const toggleSimulation = useSimulationStore((state) => state.toggleSimulation);
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
    targetRps,
    algorithm,
    metrics,
    events,
    toggleSimulation,
    setTargetRps,
    setAlgorithm,
    resetSimulation,
    triggerTrafficSpike
  };
}
