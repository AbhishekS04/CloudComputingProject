export const MOCK_CLIENTS = [
  { id: 'client-1', name: 'Web Client 1', ip: '198.51.100.4', region: 'NA-East', label: 'Chrome / macOS' },
  { id: 'client-2', name: 'Mobile App', ip: '203.0.113.19', region: 'EU-Central', label: 'iOS App v4.2' },
  { id: 'client-3', name: 'Web Client 2', ip: '198.51.100.77', region: 'NA-West', label: 'Firefox / Linux' },
  { id: 'client-4', name: 'API Consumer', ip: '192.0.2.145', region: 'AP-South', label: 'Microservice Gateway' },
  { id: 'client-5', name: 'Edge Worker', ip: '203.0.113.88', region: 'SA-East', label: 'Cloudflare Worker' }
];

export const MOCK_ENDPOINTS = [
  { path: '/api/v1/feed', method: 'GET', weight: 4 },
  { path: '/api/v1/auth/verify', method: 'POST', weight: 2 },
  { path: '/api/v1/checkout', method: 'POST', weight: 1 },
  { path: '/api/v1/products', method: 'GET', weight: 3 },
  { path: '/api/v1/analytics', method: 'POST', weight: 2 },
  { path: '/health', method: 'GET', weight: 1 }
];

let requestIdCounter = 1000;

export function generateMockRequest(clientIndex = null) {
  const client = clientIndex !== null 
    ? MOCK_CLIENTS[clientIndex % MOCK_CLIENTS.length]
    : MOCK_CLIENTS[Math.floor(Math.random() * MOCK_CLIENTS.length)];

  // Pick weighted endpoint
  const totalWeight = MOCK_ENDPOINTS.reduce((acc, e) => acc + e.weight, 0);
  let r = Math.random() * totalWeight;
  let endpoint = MOCK_ENDPOINTS[0];
  for (const ep of MOCK_ENDPOINTS) {
    if (r < ep.weight) {
      endpoint = ep;
      break;
    }
    r -= ep.weight;
  }

  requestIdCounter++;
  const reqId = `REQ-${requestIdCounter}`;

  return {
    id: reqId,
    timestamp: Date.now(),
    client,
    endpoint: endpoint.path,
    method: endpoint.method,
    clientIp: client.ip
  };
}
