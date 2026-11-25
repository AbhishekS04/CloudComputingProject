# LoadFlow — Azure Multi-VM Cluster & Visualizer Developer Guide

This document explains the end-to-end architecture of **LoadFlow**, how real traffic flows from your local system across the live **Microsoft Azure Central India Virtual Machines**, how the real-time visualizer synchronizes with zero lag, and how developers/evaluators can reproduce every cloud computing scenario (failover, stress testing, heavy compute, and node crashes).

---

## 1. System Architecture Overview

```
                          [ Terminal CLI / Client ]
                         (python send_traffic.py)
                                    │  HTTP POST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             LoadFlow Gateway / Load Balancer (Local / VM 1)             │
│            Public: 127.0.0.1:5000  |  Azure VNet: 10.0.1.4             │
│                   Algorithms: Round Robin, Least Conn, IP Hash         │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               │ HTTP POST          │ HTTP POST          │ HTTP POST
               │ (Central India)    │ (Central India)    │ (Central India)
               ▼                    ▼                    ▼
     ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
     │  Azure VM 2 (A)  │ │  Azure VM 3 (B)  │ │  Azure VM 4 (C)  │
     │  52.172.229.225  │ │  20.193.245.71   │ │  52.172.255.132  │
     │  Port: 5001      │ │  Port: 5001      │ │  Port: 5001      │
     │  Priv: 10.0.1.10 │ │  Priv: 10.0.1.11 │ │  Priv: 10.0.1.12 │
     └──────────────────┘ └──────────────────┘ └──────────────────┘
               ▲
               │ SSE (Server-Sent Events: /api/stream)
┌──────────────┴─────────────────────────────────────────────────────────┐
│               LoadFlow Interactive 3D / 2D Visualizer                   │
│                        (http://localhost:5173)                         │
│       - Event-driven particle animations (Typed Arrays, 60 FPS)        │
│       - Zero synthetic browser requests in Live Mode                   │
│       - Direct node drain/failover controls & live telemetry           │
└────────────────────────────────────────────────────────────────────────┘
```

### Cluster Node IP Directory
| Node | Name | Role | Public Endpoint | Azure VNet Private IP |
| :--- | :--- | :--- | :--- | :--- |
| **VM 1** | Gateway / LB | Reverse Proxy & L7 Balancer | `127.0.0.1:5000` | `10.0.1.4` (`10.0.1.0/24`) |
| **VM 2** | Server A (`server-1`) | Python Backend Worker | `52.172.229.225:5001` | `10.0.1.10` |
| **VM 3** | Server B (`server-2`) | Python Backend Worker | `20.193.245.71:5001` | `10.0.1.11` |
| **VM 4** | Server C (`server-3`) | Python Backend Worker | `52.172.255.132:5001` | `10.0.1.12` |

---

## 2. Live Mode vs Dummy Mode

LoadFlow features a two-way cluster toggle: **`⚡ Real-Time Azure`** and **`🧪 Dummy Sim`**.

### In `⚡ Real-Time Azure` (Live Mode):
1. **Terminal-Driven Traffic**: All packet traffic is driven by your terminal CLI (`python send_traffic.py`) or external HTTP requests.
2. **Zero Browser Auto-Dispatching**: The browser does **not** generate synthetic fake requests. When no terminal traffic is running, the visualizer remains quiet.
3. **Real Azure VM Execution**: Requests open real TCP sockets over the internet to Azure Central India. Responses report actual round-trip latency and VM instance counters.
4. **Clean Side Panel**: Dummy simulation controls (Ingress slider, Surge button, Client steppers) are hidden. In their place is the **Live Terminal Traffic Controller** with quick-copy CLI commands and live Layer 7 routing controls.

### In `🧪 Dummy Sim` (Dummy Mode):
1. **In-Memory Simulation**: Generates simulated client requests locally within JavaScript.
2. **Interactive Sliders**: Unlocks the Ingress Target rate slider (`12/s` to `5k/s`), client count stepper, and the `Surge` / `Inject` buttons.

---

## 3. How to Verify Requests Are Reaching Azure VMs

To prove that requests are physically being received and processed inside the memory of the Azure Virtual Machines:

Run the direct probe command:
```bash
python send_traffic.py --direct
```

**Output:**
```text
Direct Health & Telemetry Probe on 3 Azure Backend VMs:

  * Server A (52.172.229.225:5001 | Priv: 10.0.1.10):
     Status:           HEALTHY (Ping: 42.1ms)
     VM Instance ID:   server-1
     Requests Handled: 142 requests
     Uptime:           18452.1s (~307.5 min)

  * Server B (20.193.245.71:5001 | Priv: 10.0.1.11):
     Status:           HEALTHY (Ping: 44.6ms)
     VM Instance ID:   server-2
     Requests Handled: 98 requests
     Uptime:           18455.0s (~307.6 min)

  * Server C (52.172.255.132:5001 | Priv: 10.0.1.12):
     Status:           HEALTHY (Ping: 39.2ms)
     VM Instance ID:   server-3
     Requests Handled: 97 requests
     Uptime:           18458.2s (~307.6 min)
```
Every request sent through the Load Balancer increments the `requests_handled` counter directly on the respective VM.

---

## 4. How to Demonstrate All Scenarios

Here is how to demonstrate key cloud computing and DevOps scenarios for evaluations, demos, or testing:

### Scenario A: Normal Traffic Balancing (Round Robin)
1. Ensure all 3 servers are **ACTIVE** in the visualizer.
2. In your terminal, start continuous streaming:
   ```bash
   python send_traffic.py --rate 6
   ```
3. **What to Observe**:
   - Terminal logs show requests cycling evenly: `REQ #0001 -> Server A`, `REQ #0002 -> Server B`, `REQ #0003 -> Server C`.
   - In the visualizer, packet animations alternate smoothly between Server A, B, and C.

---

### Scenario B: High Availability & Node Failover (Draining 2 Nodes)
1. In the visualizer's right panel, click the status button on **Server B** and **Server C** to set them to **`DRAINED`** (or run `python send_traffic.py --toggle server-2` and `python send_traffic.py --toggle server-3`).
2. Run continuous traffic:
   ```bash
   python send_traffic.py --rate 6
   ```
3. **What to Observe**:
   - 100% of incoming requests automatically route **only** to **Server A** (`52.172.229.225:5001 | Priv: 10.0.1.10`).
   - Zero dropped requests (`200 OK`).
   - In the visualizer, Server B and C are greyed out with dashed paths, and packet lines bend strictly toward Server A.
   - Click to restore Server B: traffic immediately begins sharing between Server A and Server B!

---

### Scenario C: Total Cluster Outage (503 Service Unavailable)
1. Turn off **all 3 servers** (Server A, Server B, and Server C).
2. Send a request from the terminal:
   ```bash
   python send_traffic.py --once
   ```
3. **What to Observe**:
   - Terminal outputs: `[503 ERR] All backend servers offline (503 Service Unavailable)`.
   - The visualizer receives the 503 rejection event and renders a **red failure packet** with error rings bouncing off the Load Balancer.
   - Re-enable any node: routing recovers instantaneously.

---

### Scenario D: High-Concurrency Stress Test
To test the cluster under heavy multi-threaded concurrent load:
```bash
python send_traffic.py --stress --count 100 --concurrency 20
```
- **What to Observe**:
  - 20 worker threads concurrently dispatch 100 requests to the cluster.
  - The summary report displays:
    - Effective throughput (`req/s`)
    - Minimum, maximum, and average latency
    - Distribution breakdown across each Azure VM.

---

### Scenario E: Heavy Compute & Latency Simulation
To simulate database bottlenecks or heavy CPU compute operations:
```bash
python send_traffic.py --rate 4 --delay 1.0
```
- **What to Observe**:
  - Each request tells the Azure VM to process for `1.0` second before returning.
  - Active TCP socket count rises in the load balancer and visualizer (`Conns: 4+ sockets`).
  - Terminal logs show latency reflecting the delay (`1042.5ms`).

---

### Scenario F: Dynamic Balancing Strategy Switching
Switch between **Round Robin**, **Least Connections**, and **IP Hash** at any time:
- Via UI: Click the **Round Robin** / **Least Conn** / **IP Hash** segmented buttons in the right panel.
- Via CLI:
  ```bash
  python send_traffic.py --algo ip_hash
  ```
- **What to Observe**:
  - In `IP Hash` mode, requests from the same client IP (`198.51.100.4`) pin deterministically to the same Azure VM.
  - In `Least Connections` mode, requests automatically route to whichever VM has the fewest active sockets.

---

## 5. Developer CLI Quick Reference

| Command | Description |
| :--- | :--- |
| `python send_traffic.py` | Stream continuous live requests at 5 req/s |
| `python send_traffic.py --rate 10` | Stream at 10 requests per second |
| `python send_traffic.py --burst 30` | Fire a concurrent wave of 30 requests |
| `python send_traffic.py --stress` | Run a 20-worker concurrent stress test (100 reqs) |
| `python send_traffic.py --delay 1.5` | Simulate 1.5s heavy compute delay per request |
| `python send_traffic.py --toggle server-2` | Toggle VM 2 online/offline from the terminal |
| `python send_traffic.py --algo least_connections` | Switch balancing algorithm to Least Connections |
| `python send_traffic.py --direct` | Directly inspect all 3 Azure backend VMs & request counters |
| `python send_traffic.py --stats` | Print live load balancer metrics from `/api/stats` |

---

## 6. How to Start the Entire Stack

1. **Start the Python Load Balancer**:
   ```bash
   python backend/load-balancer/app.py
   ```
   *(Listens on `http://127.0.0.1:5000`)*

2. **Start the Frontend Visualizer**:
   ```bash
   npm run dev
   ```
   *(Opens `http://localhost:5173`)*

3. **Drive Live Traffic from Terminal**:
   ```bash
   python send_traffic.py --rate 5
   ```

---

## 7. Environment Variables (`.env`) & Backend Developer Checklist

This section provides the exact configuration backend developers need to deploy the Flask applications onto the 4 Microsoft Azure Virtual Machines.

### A. Environment Variables Directory

#### 1. Frontend Web App (`.env` in project root)
```env
# URL where the Load Balancer gateway is accessible from the browser
VITE_API_BASE_URL=http://localhost:5000

# Default cluster mode ('live' for real Azure VMs, 'dummy' for browser sandbox)
VITE_CLUSTER_MODE=live
```
*(If hosting the Load Balancer on Azure VM 1, change `VITE_API_BASE_URL` to `http://<VM1_PUBLIC_IP>:5000`)*

#### 2. Load Balancer Gateway (`backend/load-balancer/.env` or system env on VM 1)
```env
# Network binding
LB_HOST=0.0.0.0
LB_PORT=5000

# Comma-separated list of backend VM endpoints
BACKEND_SERVERS=server-1=http://52.172.229.225:5001,server-2=http://20.193.245.71:5001,server-3=http://52.172.255.132:5001

# Health check probe interval (seconds)
HEALTH_CHECK_INTERVAL=3.0
REQUEST_TIMEOUT=5.0
```

#### 3. Backend Worker Servers (`backend/backend-server/.env` on VM 2, 3, 4)

- **On VM 2 (`azure-vm-backend-01` · 52.172.229.225):**
  ```env
  SERVER_ID=server-1
  HOST=0.0.0.0
  PORT=5001
  ```

- **On VM 3 (`azure-vm-backend-02` · 20.193.245.71):**
  ```env
  SERVER_ID=server-2
  HOST=0.0.0.0
  PORT=5001
  ```

- **On VM 4 (`azure-vm-backend-03` · 52.172.255.132):**
  ```env
  SERVER_ID=server-3
  HOST=0.0.0.0
  PORT=5001
  ```

---

### B. Azure Network Security Group (NSG) Configuration

To allow traffic between the Load Balancer and the backend VMs:
1. Open the **Azure Portal** -> **Virtual Machines** -> select VM 2, 3, and 4.
2. Navigate to **Networking** -> **Network Security Group (NSG)** -> **Inbound security rules**.
3. Add Inbound Rule:
   - **Source**: `Any` (or restrict to VM 1 Load Balancer IP `10.0.1.4`)
   - **Source port ranges**: `*`
   - **Destination**: `Any`
   - **Destination port ranges**: `5001`
   - **Protocol**: `TCP`
   - **Action**: `Allow`
   - **Priority**: `310`
   - **Name**: `Allow_Flask_Worker_5001`

*(Similarly, for VM 1 Load Balancer, ensure port `5000` is allowed for incoming browser and terminal traffic).*

---

### C. Deploying & Running Worker Code on Azure VMs

1. SSH into the Azure VM:
   ```bash
   ssh azureuser@52.172.229.225
   ```
2. Clone or copy the `backend/backend-server/` directory:
   ```bash
   cd ~/backend-server
   pip install flask flask-cors requests
   ```
3. Run with systemd or persistent background process:
   ```bash
   export SERVER_ID="server-1"
   export HOST="0.0.0.0"
   export PORT=5001
   nohup python3 app.py > server.log 2>&1 &
   ```
4. Verify local health check:
   ```bash
   curl http://localhost:5001/health
   # Returns: {"server_id":"server-1","status":"healthy",...}
   ```

---

### D. Server Crash / Failover Simulation (Dummy & Live)

To demonstrate fault tolerance and high availability:
- **From UI**: On the **Monitoring Dashboard** -> **Azure Backend Node Fleet**, click **`Simulate Crash`** on any VM.
  - The VM turns red (`OFFLINE`).
  - Active TCP connections drain immediately.
  - The Load Balancer and visualizer automatically divert 100% of packets to the surviving healthy VMs with zero packet drops.
  - Click **`Restore VM`** to bring the VM back into the rotation.
- **From CLI**: Run `python send_traffic.py --toggle server-2` to crash or restore VM 2 directly from your terminal.
