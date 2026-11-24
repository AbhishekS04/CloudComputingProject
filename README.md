# LOADFLOW — Interactive Load Balancer Visualizer

> An interactive, educational, and high-performance load balancing simulation platform designed to visualize distributed network traffic in real time.

---

## 🚀 Architecture & Overview

**LOADFLOW** simulates client HTTP requests traversing through an intelligent load balancer and being routed across heterogeneous backend clusters according to industry-standard algorithms:

```
[ Multiple Clients / Edge Devices ]
                 │
                 ▼ (Incoming HTTP Requests)
      ┌──────────────────────┐
      │  VIRTUAL LOAD BALANCER│
      │ (VIP: 10.0.0.1:443)  │
      └──────────┬───────────┘
                 │
         ┌───────┴───────┬──────────────┐
         ▼               ▼              ▼
   ┌───────────┐   ┌───────────┐  ┌───────────┐
   │ Server A  │   │ Server B  │  │ Server C  │
   │ (US-East) │   │ (US-East) │  │ (US-East) │
   └─────┬─────┘   └─────┬─────┘  └─────┬─────┘
         │               │              │
         └───────┬───────┴──────────────┘
                 ▼ (Responses 2xx / 5xx)
        [ Client Terminals ]
```

---

## ✨ Key Capabilities & Features

### 1. Dual 3D Isometric & 2D Topological Visualizer
- **3D Isometric Engine**: Built on **Three.js** and **React Three Fiber** (`@react-three/fiber`, `@react-three/drei`). Features 3D server racks with reactive LED indicators, a central hexagonal load balancer prism with orbit data rings, floating client nodes, and curved 3D request/response trajectories. Stable, clamped camera controls to prevent disorienting rotations.
- **2D Topological Diagram**: SVG vector network architecture diagram with Bézier curve connections, directional indicators, animated packet streams, and responsive layout.
- **Unified Simulation State**: Both 2D and 3D views operate on the exact same simulation state and packet queues in real time.

### 2. High-Fidelity Simulation Engine
- Configurable **Requests Per Second (RPS)** slider with instant pacing adaptation.
- **Traffic Surge (⚡)** button that generates sudden bursts (+18 RPS) and demonstrates dynamic cluster load absorption.
- Controlled lifecycle ticks with realistic latency calculations based on CPU, RAM, and active connections.
- Correlated failure states: disabling or crashing a node causes immediate rerouting with zero lost requests for healthy instances.

### 3. Load Balancing Algorithms Implemented
1. **Round Robin**: Sequential cyclical routing across healthy servers.
2. **Least Connections**: Dynamically routes traffic to the server with the fewest active connections.
3. **Random Selection**: Uniform stochastic routing with zero inter-balancer state overhead.
4. **Weighted Round Robin**: Capacity-proportional routing respecting per-server hardware weights.
5. **IP Hash**: Deterministic client-affinity routing based on hashing client IP addresses (sticky sessions).

### 4. Comprehensive Dashboard & Pages
- **Overview Dashboard**: 4 live metric cards (Incoming Requests, RPS, Latency, Active Servers) with trend indicators and sparklines, central visualizer, distribution charts, and audit events.
- **Live Visualizer**: Dedicated full-screen visualization workspace with contextual inspector panel.
- **Server Fleet Management**: Provision new nodes, decommission servers, adjust routing weights, toggle availability, and simulate hardware crashes.
- **Traffic Analytics**: Recharts-powered graphs including throughput (RPS), Success vs. Failed requests, latency percentiles, traffic distribution pie charts, and CPU utilization over time.
- **Algorithms Hub**: Deep architectural analysis, pros/cons, time complexity, and an interactive test probe dispatcher.
- **Live Request Logs**: Searchable, filterable audit table with real-time streaming, pause controls, and JSON export.
- **Settings & Integration Layer**: Configurable simulation limits and placeholder hooks for future REST and WebSocket backends.

---

## 🛠️ Technology Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS (Warm cream editorial design system: `#F5F2EA`, `#EBE6DA`, `#FCFAF5`, `#252820`, `#4D7C5F`)
- **3D Graphics**: Three.js, React Three Fiber, `@react-three/drei`
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Analytics & Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router v6

---

## 💻 Running Locally

### Development Mode
```bash
npm run dev
```

### Production Build & Preview
```bash
npm run build
npm run preview
```

---

## ☁️ Azure Cluster & Terminal Traffic Generator

LoadFlow seamlessly connects to real Microsoft Azure Virtual Machines running in Central India.

For full architecture details, stress testing commands, and failover scenarios, see:
👉 **[AZURE_CLUSTER_DEVELOPER_GUIDE.md](AZURE_CLUSTER_DEVELOPER_GUIDE.md)**

### Quick Start:
```bash
# 1. Start Python Load Balancer Gateway (Port 5000)
python backend/load-balancer/app.py

# 2. Start Frontend Visualizer (Port 5173)
npm run dev

# 3. Stream real terminal requests across Azure VMs
python send_traffic.py --rate 5

# 4. Run high-concurrency stress test
python send_traffic.py --stress --count 100 --concurrency 20
```
