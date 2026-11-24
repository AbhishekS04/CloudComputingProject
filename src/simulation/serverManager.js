// Live Azure Backend Virtual Machines (Central India Cluster)
export const DEFAULT_SERVERS = [
  {
    id: 'server-1',
    name: 'Server A',
    host: 'azure-vm-backend-01',
    ip: '52.172.229.225:5001',
    publicIp: '52.172.229.225:5001',
    privateIp: '10.0.1.10',
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
    port: 5001,
    region: 'Azure Central India',
    specs: { cores: 2, ram: '4 GB', disk: '30 GB SSD' }
  },
  {
    id: 'server-2',
    name: 'Server B',
    host: 'azure-vm-backend-02',
    ip: '20.193.245.71:5001',
    publicIp: '20.193.245.71:5001',
    privateIp: '10.0.1.11',
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
    port: 5001,
    region: 'Azure Central India',
    specs: { cores: 2, ram: '4 GB', disk: '30 GB SSD' }
  },
  {
    id: 'server-3',
    name: 'Server C',
    host: 'azure-vm-backend-03',
    ip: '52.172.255.132:5001',
    publicIp: '52.172.255.132:5001',
    privateIp: '10.0.1.12',
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
    port: 5001,
    region: 'Azure Central India',
    specs: { cores: 2, ram: '4 GB', disk: '30 GB SSD' }
  }
];

// Offline / Simulated Dummy Servers
export const DUMMY_SERVERS = [
  {
    id: 'dummy-1',
    name: 'Dummy VM A',
    host: 'dummy-node-1.internal',
    ip: '10.0.1.14:8080',
    publicIp: '198.51.100.14:8080',
    privateIp: '10.0.1.14',
    status: 'healthy',
    weight: 3,
    cpu: 28,
    memory: 42,
    activeConnections: 12,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatency: 22,
    color: '#3B82F6',
    port: 8081,
    region: 'Simulation Sandbox',
    specs: { cores: 4, ram: '8 GB', disk: '128 GB SSD' }
  },
  {
    id: 'dummy-2',
    name: 'Dummy VM B',
    host: 'dummy-node-2.internal',
    ip: '10.0.1.27:8080',
    publicIp: '198.51.100.27:8080',
    privateIp: '10.0.1.27',
    status: 'healthy',
    weight: 2,
    cpu: 34,
    memory: 50,
    activeConnections: 16,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatency: 26,
    color: '#10B981',
    port: 8082,
    region: 'Simulation Sandbox',
    specs: { cores: 4, ram: '8 GB', disk: '128 GB SSD' }
  },
  {
    id: 'dummy-3',
    name: 'Dummy VM C',
    host: 'dummy-node-3.internal',
    ip: '10.0.1.88:8080',
    publicIp: '198.51.100.88:8080',
    privateIp: '10.0.1.88',
    status: 'healthy',
    weight: 1,
    cpu: 22,
    memory: 38,
    activeConnections: 8,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatency: 19,
    color: '#8B5CF6',
    port: 8083,
    region: 'Simulation Sandbox',
    specs: { cores: 4, ram: '8 GB', disk: '128 GB SSD' }
  }
];

export const GATEWAY_METADATA = {
  name: 'Azure VM 1 · Load Balancer Gateway',
  publicIp: '127.0.0.1:5000',
  privateIp: '10.0.1.4',
  vnet: '10.0.1.0/24'
};

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
    ip: `10.0.1.${ipSuffix}:5001`,
    publicIp: `52.172.229.${ipSuffix}:5001`,
    privateIp: `10.0.1.${ipSuffix}`,
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
    port: 5001,
    region: 'Azure Central India',
    specs: {
      cores: [2, 4, 8][index % 3],
      ram: `${[4, 8, 16][index % 3]} GB`,
      disk: '128 GB SSD'
    },
    ...customProps
  };
}
