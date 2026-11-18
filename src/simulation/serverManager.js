export const DEFAULT_SERVERS = [
  {
    id: 'srv-1',
    name: 'Server A',
    host: 'node-us-east-1.internal',
    ip: '10.0.1.14',
    status: 'healthy', // healthy | degraded | failed | disabled
    weight: 3,
    cpu: 28,
    memory: 42,
    activeConnections: 12,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatency: 22,
    color: '#3B82F6', // Blue accent
    port: 8081,
    region: 'US-East',
    specs: { cores: 8, ram: '16 GB', disk: '256 GB SSD' }
  },
  {
    id: 'srv-2',
    name: 'Server B',
    host: 'node-us-east-2.internal',
    ip: '10.0.1.27',
    status: 'healthy',
    weight: 2,
    cpu: 34,
    memory: 50,
    activeConnections: 16,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatency: 26,
    color: '#10B981', // Green accent
    port: 8082,
    region: 'US-East',
    specs: { cores: 4, ram: '8 GB', disk: '128 GB SSD' }
  },
  {
    id: 'srv-3',
    name: 'Server C',
    host: 'node-us-east-3.internal',
    ip: '10.0.1.88',
    status: 'healthy',
    weight: 1,
    cpu: 22,
    memory: 38,
    activeConnections: 8,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatency: 19,
    color: '#8B5CF6', // Purple accent
    port: 8083,
    region: 'US-East',
    specs: { cores: 2, ram: '4 GB', disk: '64 GB SSD' }
  }
];

export function createNewServer(index, customProps = {}) {
  const letters = ['D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const letter = letters[index % letters.length] || `X${index + 1}`;
  const idNum = index + 1;
  const ipSuffix = 100 + index * 12;
  const colors = ['#F59E0B', '#EC4899', '#06B6D4', '#6366F1', '#14B8A6'];
  const color = colors[index % colors.length];

  return {
    id: `srv-${idNum}`,
    name: `Server ${letter}`,
    host: `node-us-east-${idNum}.internal`,
    ip: `10.0.1.${ipSuffix}`,
    status: 'healthy',
    weight: customProps.weight || (Math.floor(Math.random() * 3) + 1),
    cpu: 20 + Math.floor(Math.random() * 15),
    memory: 35 + Math.floor(Math.random() * 15),
    activeConnections: 5 + Math.floor(Math.random() * 8),
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatency: 20 + Math.floor(Math.random() * 10),
    color: color,
    port: 8080 + idNum,
    region: 'US-East',
    specs: {
      cores: [2, 4, 8][index % 3],
      ram: `${[4, 8, 16][index % 3]} GB`,
      disk: '128 GB SSD'
    },
    ...customProps
  };
}
