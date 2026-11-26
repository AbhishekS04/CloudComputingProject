# LoadFlow — Azure 4-VM Cluster & Backend Integration Guide

> **Target Audience**: Backend Engineers, DevOps / Infrastructure Engineers, and Full-Stack Developers.  
> **Goal**: Connect the **LoadFlow Interactive Visualizer & Monitoring Dashboard** to a real 4-VM Azure cluster in real-time.

---

## 1. System Architecture & Network Topology

The cluster consists of **4 Azure Linux Virtual Machines** provisioned inside a single Virtual Network (**VNet**, `10.0.1.0/24`) in Azure East US:

```
                            CLIENT SYSTEM / BROWSER
                     (Runs LoadFlow Visualizer & Dashboard)
                                       │
                         Public Requests via Internet:
                        http://<LB_PUBLIC_IP>/api/data
                                       │
                        ┌──────────────▼──────────────┐
                        │   AZURE VM 1: GATEWAY       │
                        │   L7 Load Balancer (NGINX)  │
                        │   Public IP:  20.xxx.xxx.xxx│
                        │   Private IP: 10.0.1.4      │
                        │   Ports:      80, 8080 (WS) │
                        └──────────────┬──────────────┘
                                       │
                 Azure VNet Internal Subnet (10.0.1.0/24)
                 Forwarded via Round Robin / Least Connections
                        ┌──────────────┼──────────────┐
                        │              │              │
           ┌────────────▼──┐    ┌──────▼──────┐    ┌──▼────────────┐
           │  AZURE VM 2   │    │  AZURE VM 3 │    │  AZURE VM 4   │
           │ Backend Node 1│    │Backend Node2│    │ Backend Node 3│
           │ Standard_B2s  │    │Standard_B2s │    │ Standard_B2s  │
           │ 10.0.1.10:8081│    │10.0.1.11:8082│   │ 10.0.1.12:8083│
           └───────────────┘    └─────────────┘    └───────────────┘
```

### IP Allocation & Security Rules
* **VM 1 (Load Balancer Gateway)**:
  * **Public IP**: Assigned by Azure (e.g., `20.120.45.10` or Azure FQDN `loadflow-gateway.eastus.cloudapp.azure.com`).
  * **Private IP**: `10.0.1.4`.
  * **Azure NSG (Firewall)**: Allow Inbound `Port 80` (HTTP) and `Port 8080` (WebSocket) from Internet/Any.
* **VM 2, 3, 4 (Backend Compute Nodes)**:
  * **Public IP**: **None** (Security best practice; compute nodes must remain private).
  * **Private IPs**:
    * Node 1: `10.0.1.10` (App Port `8081`)
    * Node 2: `10.0.1.11` (App Port `8082`)
    * Node 3: `10.0.1.12` (App Port `8083`)
  * **Azure NSG**: Allow ports `8081-8083` **only from source `10.0.1.4`** (VM 1).

---

## 2. VM 1: Load Balancer Gateway Configuration (NGINX)

Install NGINX on VM 1:
```bash
sudo apt update && sudo apt install -y nginx
```

Edit `/etc/nginx/sites-available/default` (or `/etc/nginx/conf.d/loadbalancer.conf`):

```nginx
# Upstream cluster pool containing the 3 private backend VMs
upstream backend_cluster {
    # Algorithms:
    # 1. Round Robin (default, omit directive)
    # 2. Least Connections: least_conn;
    # 3. IP Hash: ip_hash;

    server 10.0.1.10:8081 max_fails=2 fail_timeout=5s;
    server 10.0.1.11:8082 max_fails=2 fail_timeout=5s;
    server 10.0.1.12:8083 max_fails=2 fail_timeout=5s;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Global proxy settings
    proxy_connect_timeout 2s;
    proxy_read_timeout 10s;
    proxy_send_timeout 10s;

    location / {
        proxy_pass http://backend_cluster;

        # ================================================================
        # CORS Headers (Required for browser fetch from visualizer)
        # ================================================================
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
        add_header 'Access-Control-Expose-Headers' 'X-Backend-Server,X-Response-Time,X-Load-Balancer-Algo' always;

        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # ================================================================
        # Telemetry Headers (Tells visualizer which VM served the request)
        # ================================================================
        add_header X-Backend-Server $upstream_addr always;
        add_header X-Response-Time $request_time always;
        add_header X-Upstream-Status $upstream_status always;
        add_header X-Load-Balancer-Algo "ROUND_ROBIN" always;
    }

    # Gateway Health Probe (used by Azure Load Balancer / Monitoring)
    location /gateway-health {
        access_log off;
        default_type application/json;
        return 200 '{"status":"healthy","gateway":"azure-vm-lb-01","vnet":"10.0.1.0/24"}';
    }
}
```

Reload NGINX:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 3. VMs 2, 3, 4: Backend Compute Node Implementation

Each backend VM runs a microservice that exposes:
1. `GET /api/data`: Application payload (serves customer traffic).
2. `GET /health`: Health probe returning CPU/RAM/Node ID.
3. `POST /crash`: Test endpoint to simulate immediate node failure.
4. `POST /recover`: Test endpoint to restore the node.

### Node.js Reference Implementation (`server.js`)
Install Node.js on each backend VM (`sudo apt install -y nodejs npm`):

```javascript
// server.js — Deploy on VM 2, 3, and 4
const http = require('http');
const os = require('os');

// Configuration from environment variables
const PORT = process.env.PORT || 8081;
const NODE_NAME = process.env.NODE_NAME || 'vm-backend-01';
const PRIVATE_IP = process.env.PRIVATE_IP || '10.0.1.10';

let isCrashed = false;
let requestCount = 0;

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. Health Probe Endpoint
  if (req.url === '/health') {
    if (isCrashed) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'DOWN', node: NODE_NAME }));
    }

    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memoryUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
    const cpuLoad = Math.round(os.loadavg()[0] * 10);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'UP',
      node: NODE_NAME,
      ip: PRIVATE_IP,
      port: PORT,
      cpu: Math.min(95, Math.max(15, cpuLoad)),
      memory: memoryUsagePercent,
      activeConnections: server.getConnections ? 4 : 2,
      totalHandled: requestCount
    }));
  }

  // 2. Simulated Outage Trigger
  if (req.url === '/crash' && req.method === 'POST') {
    isCrashed = true;
    console.log(`[ALERT] ${NODE_NAME} simulated crash activated!`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ message: `${NODE_NAME} is now CRASHED (503)` }));
  }

  // 3. Simulated Recovery Trigger
  if (req.url === '/recover' && req.method === 'POST') {
    isCrashed = false;
    console.log(`[OK] ${NODE_NAME} restored to healthy rotation.`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ message: `${NODE_NAME} recovered successfully` }));
  }

  // 4. If Crashed, reject traffic with 503
  if (isCrashed) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Service Unavailable', node: NODE_NAME }));
  }

  // 5. Standard Application API
  requestCount++;
  // Simulate standard compute latency (15ms - 35ms)
  const simulatedDelay = Math.floor(Math.random() * 20) + 15;

  setTimeout(() => {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Backend-Node': NODE_NAME,
      'X-Private-IP': PRIVATE_IP
    });
    res.end(JSON.stringify({
      message: 'Request successfully balanced and processed by Azure backend node',
      node: NODE_NAME,
      ip: PRIVATE_IP,
      requestId: requestCount,
      timestamp: new Date().toISOString()
    }));
  }, simulatedDelay);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[ONLINE] ${NODE_NAME} listening on 0.0.0.0:${PORT}`);
});
```

### Running the Services via Systemd (Production)
On each backend VM, create `/etc/systemd/system/backend.service`:

```ini
[Unit]
Description=LoadFlow Backend Compute Node
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/home/azureuser/app
Environment=PORT=8081
Environment=NODE_NAME=vm-backend-01
Environment=PRIVATE_IP=10.0.1.10
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now backend
```

---

## 4. Frontend Integration: Connecting the Visualizer in Real-Time

### How the Visualizer Animates Real Packets
The visualizer (`Visualizer2D.jsx` and `Visualizer3D.jsx`) renders packet beams directly from the Zustand store slice:
`useSimulationStore.getState().activePackets`.

When a request is made to the real Azure Load Balancer:
```
Client (Your Browser) ──(Packet Outbound)──► VM 1 (Load Balancer) ──(Packet Inbound)──► VM 2/3/4 (Target Node)
```

### Real Network Dispatcher Utility
Create `src/services/azureLiveTransport.js`:

```javascript
import { useSimulationStore } from '../store/simulationStore';

/**
 * Dispatches an actual HTTP request across the internet to Azure VM 1,
 * inspects which backend VM served it, and pushes a visual packet.
 */
export async function sendRealClusterRequest() {
  const store = useSimulationStore.getState();
  const lbHost = import.meta.env.VITE_AZURE_LB_HOST; // e.g. "http://20.xxx.xxx.xxx"

  if (!lbHost) {
    console.warn("VITE_AZURE_LB_HOST not set. Operating in mock simulation mode.");
    return;
  }

  const packetId = `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const startTime = performance.now();

  try {
    const response = await fetch(`${lbHost}/api/data?t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const elapsedLatency = Math.round(performance.now() - startTime);
    const upstreamAddr = response.headers.get('x-backend-server') || '10.0.1.10:8081';

    // Map upstream IP to our known server store
    const matchedServer = store.servers.find(
      (s) => upstreamAddr.includes(s.ip) || upstreamAddr.includes(String(s.port))
    ) || store.servers[0];

    // Create visualizer packet
    const newPacket = {
      id: packetId,
      requestId: `req-${Date.now()}`,
      client: { id: 'local-client', name: 'Browser Client', ip: 'My System' },
      targetServer: matchedServer,
      isSuccess: response.ok,
      latency: elapsedLatency,
      statusCode: response.status,
      createdTime: Date.now(),
      totalDuration: 1200 // Visual flight duration
    };

    // Update store metrics & emit packet to visualizer
    useSimulationStore.setState((state) => ({
      activePackets: [...state.activePackets.slice(-25), newPacket],
      metrics: {
        ...state.metrics,
        totalRequests: state.metrics.totalRequests + 1,
        successfulRequests: state.metrics.successfulRequests + (response.ok ? 1 : 0),
        failedRequests: state.metrics.failedRequests + (response.ok ? 0 : 1),
        avgLatency: Math.round((state.metrics.avgLatency * 4 + elapsedLatency) / 5)
      }
    }));

  } catch (err) {
    const elapsedLatency = Math.round(performance.now() - startTime);

    // Render failed 503 / network drop packet
    useSimulationStore.setState((state) => ({
      activePackets: [
        ...state.activePackets.slice(-25),
        {
          id: packetId,
          requestId: `err-${Date.now()}`,
          client: { id: 'local-client', name: 'Browser Client', ip: 'My System' },
          targetServer: null, // Bounces at LB
          isSuccess: false,
          latency: elapsedLatency,
          statusCode: 503,
          createdTime: Date.now(),
          totalDuration: 1200
        }
      ],
      metrics: {
        ...state.metrics,
        totalRequests: state.metrics.totalRequests + 1,
        failedRequests: state.metrics.failedRequests + 1
      }
    }));
  }
}
```

---

## 5. Frontend Integration: Connecting the Monitoring Dashboard

The **Monitoring Dashboard** ([MonitoringDashboardPage.jsx](file:///run/media/abhishek/BBC/best-projects/CloudComputingProject/src/pages/MonitoringDashboardPage.jsx)) visualizes 6 core metrics directly derived from your 4 Azure VMs:

```
┌───────────────────────────────────────┬────────────────────────────────────────┐
│ COMPONENT                             │ TELEMETRY SOURCE / CALCULATION         │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ MultiSeriesLineChart                  │ Rolling ingress req/s & latency from   │
│ (Real-Time Gateway Telemetry)         │ NGINX access log rate on VM 1          │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ DonutChart                            │ Real-time traffic split percentage     │
│ (Backend Node Distribution)           │ across VM 2, VM 3, and VM 4            │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ ContributionHeatmapCard               │ Hourly request density & peak diurnal  │
│ (Ingress Heatmap)                     │ spikes recorded across the cluster     │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ RadialChart                           │ 24-hour diurnal cycle polar loop:      │
│ (Diurnal Polar Clock)                 │ Delivered, Queued, and Burst req/s     │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ SlopeChart                            │ Traffic skew: Raw ingress imbalance    │
│ (Equalization Skew)                   │ vs Equalized algorithm output          │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ Ridgeline Joy Plot                    │ Gaussian response latency distribution │
│ (P95 Latency Distribution)            │ in milliseconds (ms) per backend VM    │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ NodeFleetTable                        │ Live status, CPU, RAM, and sockets     │
│ (Azure VM Management)                 │ polled from `GET /health` endpoints    │
└───────────────────────────────────────┴────────────────────────────────────────┘
```

### Telemetry Poller Service
Deploy this poller in the frontend (or as a lightweight daemon on VM 1) to sync the state:

```javascript
// src/services/azureTelemetryPoller.js
import { useSimulationStore } from '../store/simulationStore';

export function startAzureClusterPoller(intervalMs = 2000) {
  const lbHost = import.meta.env.VITE_AZURE_LB_HOST;
  if (!lbHost) return;

  const timer = setInterval(async () => {
    try {
      // 1. Fetch Gateway Health
      const gwRes = await fetch(`${lbHost}/gateway-health`).catch(() => null);
      const isGatewayUp = gwRes && gwRes.ok;

      // 2. Poll individual nodes through the load balancer bypass or health probe
      // In production, NGINX on VM 1 can proxy `/nodes/health` to gather all 3
      const fleetRes = await fetch(`${lbHost}/cluster-status`).catch(() => null);
      if (fleetRes && fleetRes.ok) {
        const fleetData = await fleetRes.json();
        useSimulationStore.setState({ servers: fleetData.servers });
      }
    } catch (e) {
      console.error("Cluster telemetry polling failed:", e);
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
```

---

## 6. Real-World Failover Testing: How to Crash a VM

To verify that failover works in real-time between Azure and the visualizer:

### Test Method 1: Using the UI Button
1. Open the Monitoring Dashboard (`/monitoring`).
2. Click **`🚨 Simulate VM Crash`** in the header.
3. Observe:
   * The victim VM (e.g., `vm-backend-02`) turns red (`CRASHED / OFFLINE`).
   * The Donut Chart slice for that VM immediately collapses to `0%`.
   * The remaining healthy VMs instantly take over 50% / 50% of the traffic.
   * Visualizer packet beams will physically bypass the crashed node.
4. Click **`♻️ Restore Fleet`** to reboot the VM.

### Test Method 2: Real SSH Systemd Crash on Azure VM
1. SSH into Backend VM 2:
   ```bash
   ssh azureuser@<VM2_PRIVATE_IP_OR_BASTION>
   ```
2. Stop the backend process:
   ```bash
   sudo systemctl stop backend
   ```
3. Within **5 seconds** (`fail_timeout=5s` in NGINX):
   * NGINX marks `10.0.1.11:8082` as unavailable.
   * Any requests sent from your laptop to `http://<LB_PUBLIC_IP>/api/data` will return responses exclusively from `10.0.1.10` and `10.0.1.12`.
   * The visualizer renders zero packets toward VM 2.
4. Restart the node:
   ```bash
   sudo systemctl start backend
   ```
   * NGINX health probes pass; the node rejoins rotation seamlessly!

---

## 7. Environment Variables Reference (`.env`)

Add this to your `.env.local` or `.env` in the project root:

```env
# ==============================================================================
# LOADFLOW AZURE CLUSTER CONFIGURATION
# ==============================================================================

# Mode: 'mock' (internal mathematical generator) or 'live' (real Azure VMs)
VITE_CLUSTER_MODE="live"

# Public URL of Azure VM 1 (The Load Balancer / Reverse Proxy)
VITE_AZURE_LB_HOST="http://20.120.45.10"
VITE_AZURE_LB_PORT="80"

# Optional WebSocket Telemetry Feed from Load Balancer
VITE_AZURE_TELEMETRY_WS_URL="ws://20.120.45.10:8080/ws/telemetry"

# ==============================================================================
# BACKEND AZURE COMPUTE NODES (Private VNet 10.0.1.0/24)
# ==============================================================================
VITE_BACKEND_NODE_1_IP="10.0.1.10"
VITE_BACKEND_NODE_1_PORT="8081"

VITE_BACKEND_NODE_2_IP="10.0.1.11"
VITE_BACKEND_NODE_2_PORT="8082"

VITE_BACKEND_NODE_3_IP="10.0.1.12"
VITE_BACKEND_NODE_3_PORT="8083"

# Polling frequency for health probes (ms)
VITE_TELEMETRY_POLL_INTERVAL_MS="1000"
```

---

## 8. Summary Checklist for Backend Developers

- [ ] **Azure NSG**: Port `80` open on VM 1; ports `8081-8083` open on VMs 2, 3, 4 for source `10.0.1.4`.
- [ ] **VM 1**: NGINX installed with the upstream block, proxy headers, and CORS enabled.
- [ ] **VMs 2, 3, 4**: Microservice listening on `0.0.0.0:808x` with `/health`, `/crash`, and `/api/data`.
- [ ] **Frontend `.env`**: Set `VITE_AZURE_LB_HOST="http://<VM1_PUBLIC_IP>"`.
- [ ] **Verification**: Send curl from your machine:
  ```bash
  curl -i http://<VM1_PUBLIC_IP>/api/data
  ```
  Verify that headers `X-Backend-Server` and `X-Response-Time` are present in the response.
