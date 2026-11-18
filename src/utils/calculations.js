/**
 * Hash function for IP Hash load balancing
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Calculate dynamic latency for a server based on its specs, active connections, and status
 */
export function calculateServerLatency(server, baseLatency = 24) {
  if (server.status === 'failed' || server.status === 'disabled') {
    return 0;
  }

  // Latency grows non-linearly when CPU/RAM is high
  const loadFactor = Math.pow(server.cpu / 100, 2) * 80;
  const connectionFactor = (server.activeConnections / 50) * 30;
  const jitter = (Math.random() - 0.5) * 8;

  let latency = baseLatency + loadFactor + connectionFactor + jitter;
  if (server.status === 'degraded') {
    latency *= 2.5;
  }

  return Math.max(8, Math.round(latency));
}

/**
 * Health assessment based on CPU, RAM, and status
 */
export function getServerHealth(server) {
  if (server.status === 'failed') return { status: 'failed', label: 'Failed', color: 'red' };
  if (server.status === 'disabled') return { status: 'disabled', label: 'Disabled', color: 'gray' };
  if (server.status === 'degraded' || server.cpu > 88 || server.memory > 90) {
    return { status: 'degraded', label: 'Degraded', color: 'amber' };
  }
  return { status: 'healthy', label: 'Healthy', color: 'green' };
}
