import { hashString } from '../utils/calculations';

export const ALGORITHM_INFO = {
  ROUND_ROBIN: {
    id: 'ROUND_ROBIN',
    name: 'Round Robin',
    tagline: 'Simple sequential cyclical distribution',
    description: 'Requests are passed to each available backend server in sequential circular order. Best for homogenous clusters where all servers have identical hardware and workloads.',
    timeComplexity: 'O(1)',
    useCase: 'Stateless servers with uniform hardware capacity and predictable query lengths.',
    pros: ['Zero overhead computation', 'Predictable uniform request count', 'Dead simple to reason about'],
    cons: ['Ignores server resource saturation', 'Assumes all requests take equal processing time']
  },
  LEAST_CONNECTIONS: {
    id: 'LEAST_CONNECTIONS',
    name: 'Least Connections',
    tagline: 'Dynamic load-aware routing',
    description: 'Routes incoming requests to the server currently handling the fewest active connections. Highly dynamic and responsive to uneven task durations.',
    timeComplexity: 'O(N) or O(log N)',
    useCase: 'Long-lived HTTP connections, WebSockets, streaming media, or complex database queries.',
    pros: ['Prevents server overload', 'Adapts automatically to traffic surges', 'Self-balancing under varying request durations'],
    cons: ['Requires real-time connection state synchronization', 'Slightly higher routing decision latency']
  },
  RANDOM: {
    id: 'RANDOM',
    name: 'Random Selection',
    tagline: 'Stochastic uniform distribution',
    description: 'Selects a healthy server completely at random with equal probability. Over large sample sizes, behaves similar to round robin with zero coordination state.',
    timeComplexity: 'O(1)',
    useCase: 'Distributed microservice meshes where state synchronization across multiple load balancers is expensive.',
    pros: ['No state required between load balancers', 'Immune to synchronized convoy effects', 'Trivially scalable'],
    cons: ['Short-term statistical clumping', 'Can accidentally hit heavily loaded servers during bursts']
  },
  WEIGHTED_ROUND_ROBIN: {
    id: 'WEIGHTED_ROUND_ROBIN',
    name: 'Weighted Round Robin',
    tagline: 'Capacity-proportional cyclical routing',
    description: 'Assigns each server a relative weight based on its hardware capacity (CPU cores, RAM, network bandwidth). Higher-weight servers receive proportionally more requests.',
    timeComplexity: 'O(1) with precomputed sequence',
    useCase: 'Heterogeneous server pools mixing high-spec bare metal machines with smaller cloud VMs.',
    pros: ['Optimally maximizes utilization of expensive high-tier nodes', 'Configurable capacity ratios', 'Deterministic'],
    cons: ['Static weights require manual tuning or auto-discovery', 'Still does not observe transient live spikes']
  },
  IP_HASH: {
    id: 'IP_HASH',
    name: 'IP Hash',
    tagline: 'Deterministic client-affinity routing',
    description: 'Computes a cryptographic or mathematical hash of the client IP address to determine the target backend server. Guarantees that requests from the same client IP consistently reach the same server.',
    timeComplexity: 'O(1)',
    useCase: 'Stateful sessions, localized in-memory caching, shopping carts without shared Redis layers.',
    pros: ['Native sticky sessions without external session stores', 'Maximizes in-memory server cache hit rate', 'Zero cross-server chatter'],
    cons: ['Uneven distribution if many users share NAT/Proxy IPs', 'Server addition/removal invalidates mappings (unless consistent hashing is used)']
  }
};

class LoadBalancingAlgorithmManager {
  constructor() {
    this.roundRobinIndex = 0;
    this.weightedCurrentWeights = {};
  }

  reset() {
    this.roundRobinIndex = 0;
    this.weightedCurrentWeights = {};
  }

  selectServer(algorithmId, servers, clientIp = '192.168.1.1') {
    // Only route to available, healthy/degraded servers
    const availableServers = servers.filter(
      (s) => s.status !== 'failed' && s.status !== 'disabled'
    );

    if (availableServers.length === 0) {
      return null;
    }

    switch (algorithmId) {
      case 'ROUND_ROBIN':
        return this.roundRobin(availableServers);

      case 'LEAST_CONNECTIONS':
        return this.leastConnections(availableServers);

      case 'RANDOM':
        return this.randomSelection(availableServers);

      case 'WEIGHTED_ROUND_ROBIN':
        return this.weightedRoundRobin(availableServers);

      case 'IP_HASH':
        return this.ipHash(availableServers, clientIp);

      default:
        return this.roundRobin(availableServers);
    }
  }

  roundRobin(servers) {
    if (this.roundRobinIndex >= servers.length) {
      this.roundRobinIndex = 0;
    }
    const selected = servers[this.roundRobinIndex];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % servers.length;
    return selected;
  }

  leastConnections(servers) {
    let minServer = servers[0];
    for (let i = 1; i < servers.length; i++) {
      if (servers[i].activeConnections < minServer.activeConnections) {
        minServer = servers[i];
      } else if (servers[i].activeConnections === minServer.activeConnections) {
        // Tie-breaker: lower CPU
        if (servers[i].cpu < minServer.cpu) {
          minServer = servers[i];
        }
      }
    }
    return minServer;
  }

  randomSelection(servers) {
    const idx = Math.floor(Math.random() * servers.length);
    return servers[idx];
  }

  weightedRoundRobin(servers) {
    // Smooth weighted round-robin algorithm (Nginx approach)
    let totalWeight = 0;
    let bestServer = null;

    for (const server of servers) {
      const weight = Math.max(1, server.weight || 1);
      totalWeight += weight;

      if (this.weightedCurrentWeights[server.id] === undefined) {
        this.weightedCurrentWeights[server.id] = 0;
      }
      this.weightedCurrentWeights[server.id] += weight;

      if (!bestServer || this.weightedCurrentWeights[server.id] > this.weightedCurrentWeights[bestServer.id]) {
        bestServer = server;
      }
    }

    if (bestServer) {
      this.weightedCurrentWeights[bestServer.id] -= totalWeight;
      return bestServer;
    }

    return servers[0];
  }

  ipHash(servers, clientIp) {
    const hash = hashString(clientIp || '127.0.0.1');
    const index = hash % servers.length;
    return servers[index];
  }
}

export const algorithmManager = new LoadBalancingAlgorithmManager();
