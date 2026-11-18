export function simulateServerFailure(server) {
  return {
    ...server,
    status: 'failed',
    activeConnections: 0,
    cpu: 0,
    memory: Math.round(server.memory * 0.4)
  };
}

export function simulateServerRecovery(server) {
  return {
    ...server,
    status: 'healthy',
    cpu: 25 + Math.floor(Math.random() * 10),
    memory: 40 + Math.floor(Math.random() * 10),
    activeConnections: 2
  };
}

export function simulateServerDegrade(server) {
  return {
    ...server,
    status: 'degraded',
    cpu: 85 + Math.floor(Math.random() * 12),
    memory: 88 + Math.floor(Math.random() * 8),
    avgLatency: Math.round(server.avgLatency * 2.8)
  };
}

export function toggleServerDisable(server) {
  const isCurrentlyDisabled = server.status === 'disabled';
  return {
    ...server,
    status: isCurrentlyDisabled ? 'healthy' : 'disabled',
    activeConnections: isCurrentlyDisabled ? 2 : 0,
    cpu: isCurrentlyDisabled ? 25 : 0
  };
}
