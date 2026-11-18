import React, { useEffect, useRef } from 'react';
import { LoadBalancerVisualizer } from './LoadBalancerVisualizer';
import './visualizer.css';

export default function LoadBalancerVisualizerCanvas({
  algorithm = 'ROUND ROBIN',
  servers = [
    { id: 'srv-a', name: 'Server A', cpu: 48, connections: 15, healthy: true, position: { x: -7.2, z: 1.5 } },
    { id: 'srv-b', name: 'Server B', cpu: 60, connections: 18, healthy: true, position: { x: -3.8, z: 4.5 } },
    { id: 'srv-c', name: 'Server C', cpu: 38, connections: 11, healthy: true, position: { x: -0.4, z: 7.5 } },
  ],
  clients,
  onSelectNode,
  isRunning = true,
  targetRps = 6,
}) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    instanceRef.current = new LoadBalancerVisualizer(
      containerRef.current,
      {
        loadBalancer: {
          id: 'lb-main',
          title: 'LOAD\nBALANCER',
          subtitle: algorithm,
          position: { x: 0, z: 0 },
        },
        servers,
        clients,
      },
      {
        onSelectNode,
      }
    );

    return () => {
      instanceRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.updateServerMetrics(servers);
  }, [servers]);

  useEffect(() => {
    instanceRef.current?.updateAlgorithm(algorithm);
  }, [algorithm]);

  useEffect(() => {
    instanceRef.current?.setIsRunning?.(isRunning);
  }, [isRunning]);

  useEffect(() => {
    instanceRef.current?.setTargetRps?.(targetRps);
  }, [targetRps]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '620px' }} />;
}
