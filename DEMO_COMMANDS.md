# LoadFlow — Azure Cluster Commands & Faculty Demo Playbook

This guide contains every terminal command needed to start, verify, crash-test, and present the **LoadFlow Cloud Load Balancer** running against your **3 live Microsoft Azure VMs (Central India)**.

---

## Architecture Endpoints

| Role | Host / IP | Private VNet IP | Location |
| :--- | :--- | :--- | :--- |
| **Frontend Visualizer** | `http://localhost:5173` | — | Localhost (Vite + React) |
| **Load Balancer Gateway** | `http://127.0.0.1:5000` | `10.0.1.4` | Localhost (Python Flask L7 LB) |
| **Server A (`backend-vm-1`)** | `52.172.229.225:5001` | `172.16.0.4` / `10.0.1.10` | Azure Central India |
| **Server B (`backend-vm-2`)** | `20.193.245.71:5001` | `10.0.1.11` | Azure Central India |
| **Server C (`backend-vm-3`)** | `52.172.255.132:5001` | `10.0.1.12` | Azure Central India |

---

## 1. Starting the System (2 Terminals)

### Terminal 1 — Start Python Load Balancer
```bash
python backend/load-balancer/app.py
```

### Terminal 2 — Start Frontend Visualizer
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser and ensure **`Real-Time Azure`** is selected.

---

## 2. Core Demo Commands (Run in Terminal 3)

### Verify All 3 Azure VMs Directly (Proves Real Cloud Infrastructure)
```bash
python send_traffic.py --direct
```
Bypasses the load balancer and pings each Azure VM directly (`52.172.229.225`, `20.193.245.71`, `52.172.255.132`), printing their real Azure uptimes and internal request counters.

### Stream Continuous Live Traffic (1:1:1 Balancing)
```bash
python send_traffic.py --rate 5
```
Streams 5 real HTTP requests/second. Press `Ctrl+C` to stop.

### Switch Routing Algorithms Dynamically
```bash
python send_traffic.py --algo round_robin
python send_traffic.py --algo least_connections
python send_traffic.py --algo ip_hash
```

### Send a Burst Wave or Concurrency Stress Test
```bash
python send_traffic.py --burst 30
python send_traffic.py --stress --count 100 --concurrency 20
```

### Check Live Cluster Metrics & Logs
```bash
python send_traffic.py --stats
```

---

## 3. Faculty Presentation: Without LB vs. With LB

This sequence proves *why* a Load Balancer prevents single-server outages:

### Step A — Turn Load Balancer OFF (Single-VM Crash)
1. Stop Terminal 1 (`Ctrl+C` on `backend/load-balancer/app.py`).
   * *In Visualizer:* Only the **Load Balancer block discolors** (`LB OFFLINE`). All 3 Azure VMs remain blue.
2. Run the direct single-VM flood:
   ```bash
   python send_traffic.py --no-lb
   ```
   *(Optional: add `--target server-2` to hit Server B specifically).*
   * *Result:* 100% of the 45-request / 25-thread flood hits a single random Azure VM. That VM exceeds single-node capacity and crashes (`503`), while the other 2 VMs sit unused. All remaining requests fail because there is no LB to shift traffic.

### Step B — Turn Load Balancer ON (Same Flood, 0 Crashes)
1. Restart Terminal 1:
   ```bash
   python backend/load-balancer/app.py
   ```
   * *In Visualizer:* Load Balancer turns golden amber and all 3 VMs return blue.
2. Run the identical 45-request / 25-thread flood through the Load Balancer:
   ```bash
   python send_traffic.py --with-lb
   ```
   * *Result:* The Load Balancer distributes the 25 concurrent threads evenly across all 3 Azure VMs (`~8` each). **0 crashes, 45/45 `200 OK`!**

---

## 4. Failover & Node Crash Tests

### Extreme Overload Crash + Smooth Failover (LB Active)
```bash
python send_traffic.py --overload
```
Floods the cluster with 55 concurrent threads, tripping the Load Balancer circuit breaker on overwhelmed node(s) (`CRASHED • FAILOVER`) while smoothly rerouting all live traffic to surviving healthy Azure VMs.

### Drain / Restore a Specific Server Node Manually
```bash
python send_traffic.py --toggle server-2
python send_traffic.py --restore
```

### Full 4-Act Automated Faculty Demo (All-in-One)
```bash
python send_traffic.py --demo
```
*(Or hands-free without pauses: `python send_traffic.py --demo --auto`)*

---

## 5. Testing a 100% Real Hardware/Process Shutdown on Azure

1. Start traffic: `python send_traffic.py --rate 4`
2. Go to **Azure Portal** $\rightarrow$ Virtual Machines $\rightarrow$ **`backend-vm-2`** $\rightarrow$ click **Stop** (or SSH in and run `pkill -f app.py`).
3. Within **2.5 seconds**, the Load Balancer's `/health` check detects the dead socket, marks **Server B** as `CRASHED`, and shifts 100% of requests to **Server A** and **Server C** with zero dropped packets.
4. Click **Start** in Azure Portal to watch **Server B** automatically rejoin rotation.
