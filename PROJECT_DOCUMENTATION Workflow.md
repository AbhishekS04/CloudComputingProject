3
# LOADFLOW — Cloud-Based Load Balancing Simulation System

> Detailed technical documentation covering the application architecture, backend components, frontend components, load-balancing algorithms, Azure deployment model, request lifecycle, telemetry, testing, and current implementation gaps.

**Repository:** `AbhishekS04/CloudComputingProject`  
**Inspected branch:** `main`  
**Inspected source commit:** `0faff1a121cdb6c030b7dba3662514c5b40d00d0` (`crazyyy ui`)  
**Commit timestamp:** 2026-11-26 07:28:24 UTC  
**Documentation status:** Source-code review with deployment facts supplied by the project owner.

---

## 1. Project summary

LOADFLOW is a cloud load-balancing platform with two connected purposes:

1. **Live cloud request routing:** a Python Flask gateway receives HTTP requests, chooses a target from a configured backend pool, forwards the request to a worker service, records the result, performs health checks, and emits live events.
2. **Interactive visualization and simulation:** a React application presents the cluster topology, animates request/response paths, exposes server and algorithm controls, and displays traffic statistics. It can also run a browser-side dummy simulation that does not contact Azure.

The system is intended to demonstrate request distribution, algorithm comparison, server health monitoring, overload handling, failover, and the difference between direct-to-node traffic and traffic routed through a load balancer.

The repository uses the product name **LOADFLOW**. In the Cloud Computing project context, it is the implementation of the **Cloud-Based Load Balancing Simulation System**.

### 1.1 Main objectives

- Distribute incoming HTTP requests across a pool of service nodes.
- Demonstrate multiple load-balancing algorithms.
- Keep unhealthy or disabled nodes out of the eligible routing pool.
- Track request totals, failures, active connections, and response latency.
- Detect worker health through periodic HTTP probes.
- Retry other healthy nodes after a selected worker becomes unavailable.
- Demonstrate overload quarantine and recovery behavior.
- Stream request and server-state events to the visualizer.
- Provide a separate dummy mode for safe, local algorithm demonstrations.

### 1.2 What is implemented versus what is illustrative

The project contains both real backend behavior and visual simulation behavior. They must not be treated as interchangeable.

| Area | Source-backed behavior |
|---|---|
| Flask load balancer | Performs real HTTP forwarding to configured worker URLs. |
| Flask worker service | Exposes health, information, and request-processing endpoints. |
| Backend health checks | Calls each configured worker's `/health` endpoint. |
| Backend request counters | Counts requests handled by each worker process. |
| Gateway request statistics | Tracks request outcomes and timing in process memory. |
| Browser Dummy Sim | Generates synthetic requests and synthetic server metrics in JavaScript. |
| Browser Live mode | Does not continuously generate traffic automatically; it visualizes events from the gateway and can send explicit manual probes/bursts. |
| CPU/RAM in the current live UI | Not provided by the worker `/health` response; displayed values are derived or retained UI estimates rather than verified host telemetry. |
| Some monitoring cards and traffic histories | Use static/sample data and should not be presented as measured Azure production telemetry. |

---

## 2. Current deployment facts and topology

The following facts were supplied by the project owner and take precedence over old topology diagrams in the repository:

- The **fourth Azure VM is the dedicated load-balancer VM**.
- The React frontend is currently run locally and has **not yet been deployed** as a hosted frontend.
- The `10.0.1.0/24` network range and related `10.0.1.x` addresses appearing in the source and older guides are examples/dummy values, not the actual Azure network configuration.
- The actual Azure VM IP addresses differ from the hard-coded sample addresses in the repository and have intentionally not been reproduced here.
- The project owner described the other three Azure VMs as clients. The current committed gateway/worker source, however, models three configured **backend worker endpoints**. This role discrepancy is important and is recorded in [Section 18](#18-important-source-and-deployment-discrepancies).

### 2.1 Logical request path represented by the code

The code-level request path is:

```text
Request producers
(local React browser, send_traffic.py, or other HTTP clients)
                 |
                 | HTTP request
                 v
       Azure VM #4 — Flask Load Balancer
       Host/port configured for the VM; app default port: 5000
                 |
                 | HTTP POST to selected worker's /api/process
                 v
       Configured backend worker pool
           |          |          |
           v          v          v
        worker-1   worker-2   worker-3
        :5001      :5001      :5001
           |          |          |
           +----------+----------+
                 response
                    |
                    v
       Load Balancer response + tracker update
                    |
          +---------+----------+
          |                    |
          v                    v
       HTTP client         SSE /api/stream
                               |
                               v
                    Local React visualizer
```

This represents the **logical software architecture**, not a verified Azure IP map. The gateway's worker URLs must be set to the actual service endpoints used in the current Azure environment.

### 2.2 VM role mapping must be validated before treating the topology as final

There is a conflict between the latest owner-provided VM description and the committed code:

- Owner-provided description: VM #4 is the load balancer and the other three VMs are clients.
- `backend/load-balancer/config.py`: creates `server-1`, `server-2`, and `server-3` as remote worker URLs.
- `backend/load-balancer/app.py`: forwards requests to each selected URL at `/api/process`.
- `backend/backend-server/app.py`: implements the worker endpoints `/health`, `/api/info`, and `/api/process`.
- `send_traffic.py`: treats the three configured IPs as backend service nodes.

Therefore, the repository's executable architecture is **client/request source → VM #4 gateway → three backend worker endpoints**. If the three other Azure VMs are genuinely only request-generating clients, then the gateway's backend worker pool must point to a separate set of service hosts, or the deployed application differs from the repository. The exact mapping should be confirmed against the services actually running on Azure before using a VM-by-VM diagram in a final report or presentation.

### 2.3 No real Azure addresses are specified in this document

Do not copy the example addresses in `config.py`, `serverManager.js`, `send_traffic.py`, `AZURE_CLUSTER_DEVELOPER_GUIDE.md`, or `DEMO_COMMANDS.md` into deployment instructions. Replace placeholders with the currently assigned Azure values in the deployment environment.

---

## 3. Technology stack

### 3.1 Frontend

| Technology | Purpose |
|---|---|
| React 18 | Component-based user interface. |
| Vite 6 | Development server and production build tool. |
| JavaScript / JSX / TypeScript / TSX | Application and visualization source. |
| Zustand 5 | Shared simulation and monitoring state. |
| React Router 6 | Page routing. |
| Tailwind CSS 3 | Utility-based styling. |
| Recharts 2 | Charting used by analytics/dashboard areas. |
| Three.js | 3D rendering dependency; a separate Three.js visualizer module exists in the repository. |
| Framer Motion / Motion | UI transitions and animations. |
| React Three Fiber / Drei | Installed dependencies; not the renderer used by the main `Visualizer2D`/`Visualizer3D` route components in the inspected source. |
| Lucide React / Reicon | Icons used by interface components. |

### 3.2 Backend

| Technology | Purpose |
|---|---|
| Python | Backend and traffic-generator language. |
| Flask 3.1.0 | REST endpoints for gateway and workers. |
| Flask-CORS 5.0.1 | Cross-origin access for the browser frontend. |
| Requests 2.32.3 | Gateway-to-worker HTTP calls, health checks, and CLI HTTP requests. |
| Python threading | Concurrent Flask request handling, background health checks, and lock-protected state. |
| `queue.Queue` | Per-client queue for Server-Sent Events. |
| `collections.deque` | Bounded in-memory request log. |
| pytest 8.3.4 | Backend test suite. |

### 3.3 Runtime ports in the current source defaults

| Process | Default port | Config source |
|---|---:|---|
| Flask load balancer | `5000` | `LB_PORT` |
| Flask backend worker | `5001` | `PORT` |
| Vite frontend | `5173` | `vite.config.js` |

These are application defaults, not a statement about the actual Azure public/private IP allocation or NSG configuration.

---

## 4. Repository structure and component responsibilities

The repository is a monorepo containing the React frontend, Python gateway, Python worker, traffic generator, tests, visual assets, and developer guides.

### 4.1 Backend source

```text
backend/
├── backend-server/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   └── tests/
│       └── test_app.py
│
└── load-balancer/
    ├── app.py
    ├── config.py
    ├── requirements.txt
    ├── algorithms/
    │   ├── round_robin.py
    │   ├── least_connections.py
    │   ├── random_balancer.py
    │   ├── weighted_round_robin.py
    │   └── ip_hash.py
    ├── services/
    │   ├── health_check.py
    │   └── request_tracker.py
    └── tests/
        └── test_load_balancer.py
```

| File/module | Responsibility |
|---|---|
| `backend/load-balancer/app.py` | Flask gateway; algorithm registry; API endpoints; request routing; retries; overload quarantine; SSE event broadcasting. |
| `backend/load-balancer/config.py` | Gateway host/port, backend URL list, sample metadata, health-check interval, request timeout, and overload limits. |
| `algorithms/round_robin.py` | Thread-safe sequential routing. |
| `algorithms/least_connections.py` | Routes to the worker snapshot with the smallest active-connection count. |
| `algorithms/random_balancer.py` | Random selection from eligible workers. |
| `algorithms/weighted_round_robin.py` | Cycles through a repeated worker list based on configured weights. |
| `algorithms/ip_hash.py` | Maps a client IP hash to an eligible worker. |
| `services/request_tracker.py` | Worker pool state, enabled/health status, connection counters, request totals, latency averages, and bounded logs. |
| `services/health_check.py` | Periodically calls worker health endpoints and updates node state. |
| `backend/backend-server/app.py` | Worker Flask service; reports health/info and processes requests. |
| `backend/backend-server/config.py` | Worker identity, host binding, and port. |
| `send_traffic.py` | External HTTP traffic generator, CLI control client, direct worker probe, stress test, and demo scenarios. |

### 4.2 Frontend source

```text
src/
├── App.jsx
├── main.jsx
├── assets/styles/
├── components/
│   ├── controls/
│   ├── dashboard/
│   ├── isometric/
│   ├── layout/
│   ├── learn/
│   ├── monitoring/
│   ├── ui/
│   ├── charts/
│   └── visualizer/
├── data/
├── hooks/
├── lib/
├── pages/
├── services/
├── simulation/
├── store/
└── utils/
```

| Folder/file | Responsibility |
|---|---|
| `src/App.jsx` | Starts the simulation engine, configures app providers, and declares routes. |
| `src/main.jsx` | React DOM entry point. |
| `src/pages/` | Dashboard, visualizer, monitoring, servers, analytics, algorithms, logs, settings, and about pages. |
| `src/components/controls/` | Simulation controls and command-bar UI. |
| `src/components/dashboard/` | Summary metrics, server status and traffic chart components. |
| `src/components/layout/` | Navigation, sidebar, top bar, right-side studio panel, search, and main layout. |
| `src/components/visualizer/` | Main 2D/3D-style topology visualizers and inspector panel. |
| `src/components/monitoring/` | Monitoring charts, node fleet table, heatmaps and telemetry panels. |
| `src/components/charts/` | Reusable chart primitives and custom SVG/chart utilities. |
| `src/components/learn/` and `src/data/courseData.js` | Educational/learning content and interactive explainers. |
| `src/hooks/` | Zustand-backed hooks for simulation, servers, and traffic. |
| `src/services/api.js` | REST service wrapper. |
| `src/services/websocket.js` | Optional WebSocket service abstraction; not the current gateway event transport. |
| `src/services/liveStoreBridge.js` | Additional window/store bridge helper; no active import/call site was found in the reviewed app entry paths. |
| `src/simulation/engine.js` | Browser simulation timer, live backend polling, SSE event processing, and UI metric updates. |
| `src/simulation/loadBalancingAlgorithms.js` | Frontend implementations of all five algorithms. |
| `src/simulation/serverManager.js` | Default and dummy worker data used by the interface. |
| `src/simulation/trafficGenerator.js` | Mock client definitions and synthetic request generation. |
| `src/simulation/failureSimulator.js` | Local simulated failure, recovery, degradation, and disable operations. |
| `src/store/simulationStore.js` | Central Zustand state and UI actions. |
| `src/utils/` | Hashing, latency/health estimates, and display formatters. |

### 4.3 Routes currently declared by `src/App.jsx`

| Route | Page | Purpose |
|---|---|---|
| `/` | `MainPlatformPage` | Main interactive platform with the topology visualizer and system-design navigation. |
| `/monitoring` | `MonitoringDashboardPage` | Monitoring/telemetry dashboard. |
| `/about` | `AboutPage` | About and educational/project information. |
| `/visualizer` | `VisualizerPage` | Dedicated visualizer page with controls and summary metrics. |
| `/servers` | `ServersPage` | Server fleet display and local control UI. |
| `/analytics` | `AnalyticsPage` | Traffic and performance analytics. |
| `/algorithms` | `AlgorithmsPage` | Algorithm explanations, selection, and probe dispatcher. |
| `/logs` | `LogsPage` | Searchable/filterable request logs and JSON export. |
| `/settings` | `SettingsPage` | Simulation settings and integration placeholder fields. |

The `/visualizer`, `/servers`, `/analytics`, `/algorithms`, `/logs`, and `/settings` pages are nested inside `MainLayout`.

---

## 5. Backend architecture

The backend has two independently runnable Flask applications:

1. **Load Balancer Gateway** — accepts external requests and forwards each request to one selected worker.
2. **Backend Worker** — receives the forwarded request, optionally waits for a configured processing delay, increments a process-local request counter, and returns a JSON response.

The gateway and worker are separate services. The worker is not the load balancer.

### 5.1 Load balancer initialization

`backend/load-balancer/app.py` defines `create_app(start_health_checker=True)`.

During initialization it:

1. Creates the Flask application.
2. Enables CORS (using Flask-CORS when installed, with a permissive fallback header handler otherwise).
3. Calls `config.get_initial_servers()` to build the configured server list.
4. Creates a `RequestTracker` for the server pool.
5. Creates the active algorithm registry.
6. Initializes shared state for the selected algorithm and gateway pause flag.
7. Creates a list of SSE subscriber queues.
8. Instantiates a `HealthChecker` connected to the tracker.
9. Optionally performs an immediate health check and starts the background health-check thread.

The default selected algorithm in this source is `round_robin`.

### 5.2 Gateway state and synchronization

The gateway uses locks to protect shared mutable state:

- `state_lock` protects the active algorithm and pause flag.
- `subscribers_lock` protects the SSE subscriber list.
- `RequestTracker` has its own lock protecting server counters, status, request totals, and logs.
- `RoundRobinBalancer` and `WeightedRoundRobinBalancer` use per-instance locks around their indexes.

The tracker is in-memory. It is not backed by a database or durable event store. Restarting the gateway resets its request counters and log history.

### 5.3 Request-routing lifecycle

For a request received by `/api/request` (or one of its aliases), the gateway follows this sequence:

1. **Pause check:** if the gateway pause flag is set, return HTTP `503` and do not forward the request.
2. **Capture request context:** record arrival time, selected algorithm, JSON payload, and client IP.
3. **Resolve client IP:** prefer JSON `clientIp`, then JSON `client_ip`, then `X-Forwarded-For`, then Flask's `remote_addr`, then a fallback value.
4. **Get eligible nodes:** use the tracker to obtain enabled nodes whose health status is `healthy`.
5. **No-node handling:** if no healthy workers are available, broadcast an SSE request event and return HTTP `503`.
6. **Apply delay option:** if the JSON body does not contain `delay` but a query-string `delay` exists, copy it into the forwarded payload.
7. **Select a worker:** ask the currently active balancer to select from the current candidate list.
8. **Overload guard:** when the selected worker's tracked active-connection count is at or above `OVERLOAD_MAX_CONNS` and another candidate exists, mark the worker unhealthy for the configured cooldown, record an overload failure, broadcast failure/server events, and try another candidate.
9. **Start connection tracking:** increment the selected worker's active-connection count and assign a request ID.
10. **Forward the request:** send HTTP POST to `<worker-url>/api/process` using the configured request timeout.
11. **Record the outcome:** decrement active connections, increment totals, compute/update response-time data, and append a log entry.
12. **Broadcast live event:** send a `request` event containing selected worker, algorithm, status, response timing, and timestamp.
13. **Return gateway response:** send a JSON response containing request ID, algorithm, selected worker, response timings, and the worker response.
14. **Retry after an exception:** mark the selected worker unhealthy; then loop through the remaining healthy candidates. If all attempted candidates fail, return HTTP `502`.

The retry loop tries a worker at most once in a single incoming request because worker IDs are added to `tried_ids` after selection.

### 5.4 Failover behavior

There are three distinct failure paths:

| Condition | Gateway behavior |
|---|---|
| No enabled, healthy workers at request start | Returns HTTP `503` with `No healthy backend servers available`. |
| A selected worker raises a timeout/connection/response exception | Marks that worker unhealthy; tries another worker from the remaining healthy candidates. |
| All eligible candidates fail during the request | Returns HTTP `502` with `All attempted backend servers failed to respond`. |

A timeout is marked with a cooldown using `OVERLOAD_COOLDOWN_SEC`. A non-timeout connection failure is marked unhealthy without a configured cooldown; a later successful health probe can mark it healthy again.

The overload guard is an **application-level quarantine mechanism**. It changes the load balancer's tracked worker status; it does not power off, restart, or deallocate the underlying Azure VM.

### 5.5 Circuit-breaker/overload configuration

Current source defaults in `backend/load-balancer/config.py`:

| Environment variable | Default | Meaning |
|---|---:|---|
| `OVERLOAD_MAX_CONNS` | `12` | Active-connection threshold used by the overload guard. |
| `OVERLOAD_COOLDOWN_SEC` | `20.0` | How long a quarantined worker remains unhealthy after overload/timeout. |
| `REQUEST_TIMEOUT` | `4.0` seconds | Timeout for gateway-to-worker request forwarding. |
| `HEALTH_CHECK_INTERVAL` | `2.5` seconds | Delay between periodic health-check passes. |

The overload guard only quarantines a selected worker when there is at least one other candidate (`len(candidates) > 1`). With only one candidate remaining, this guard is bypassed.

### 5.6 Health-check lifecycle

`backend/load-balancer/services/health_check.py`:

1. Gets the current server list from the tracker.
2. Skips HTTP probing for nodes already disabled and retains their `offline` state.
3. For enabled nodes, sends `GET <worker-url>/health` with the health checker's timeout (default `2.0` seconds).
4. Treats HTTP `200` as healthy; request exceptions or non-200 responses are unhealthy.
5. Calls `RequestTracker.update_health`.
6. Broadcasts a `server_update` event when the status changes.
7. Repeats in a daemon thread using the configured interval.

The worker's current `/health` response only reports status, worker ID, and timestamp. It does not report measured CPU or RAM usage.

### 5.7 Request tracker and metrics

`backend/load-balancer/services/request_tracker.py` manages:

- Worker ID, display name, URL, public/private display fields.
- `enabled` and health `status` fields.
- Active connection count.
- Per-worker total and failed request counts.
- Per-worker average response time for successful requests.
- Last health-check timestamp and crash reason.
- Gateway aggregate total, successful, and failed request counts.
- Aggregate active connections and average successful response time.
- Request logs in a bounded deque with a default maximum of 500 entries.

All counters and logs are held in memory. They are not persisted across gateway restarts.

---

## 6. Backend worker service

The worker application is implemented in `backend/backend-server/app.py`.

### 6.1 Worker configuration

`backend/backend-server/config.py` reads:

| Variable | Default | Purpose |
|---|---|---|
| `SERVER_ID` | `server-1` | Worker identity included in responses. |
| `HOST` | `0.0.0.0` | Bind address. |
| `PORT` | `5001` | Worker HTTP port. |

### 6.2 Worker endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Returns healthy status, server ID, and timestamp. Used by the gateway health checker. |
| `/api/info` | GET | Returns server ID, host, port, uptime seconds, and process-local `requests_handled` count. |
| `/api/process` | GET/POST | Main worker request handler. |
| `/api/request` | GET/POST | Alias for the request handler. |
| `/request` | GET/POST | Alias for the request handler. |
| `/` | GET/POST | Alias for the request handler. |

### 6.3 Worker request processing

The worker request handler:

1. Records a start time.
2. Reads JSON body (or an optional query-string `delay`).
3. Converts delay to a number and clamps it between `0` and `10` seconds.
4. Waits for that delay when it is greater than zero.
5. Increments a thread-safe process-local request counter.
6. Computes processing time.
7. Returns JSON including worker ID, request number, processing time, status, message, and timestamp.

The delay parameter is a demonstration mechanism for varying request duration and creating concurrency/overload scenarios. It does not represent a real database or compute workload.

### 6.4 Worker metrics limitations

- `requests_handled` is in-process memory and resets when the worker process restarts.
- `/health` does not return CPU or RAM metrics.
- `/api/info` does not return CPU or RAM metrics.
- There is no database or persistent request history in the worker service.

---

## 7. Load-balancing algorithms

The repository has five algorithm descriptions and five frontend implementations. The Python gateway currently registers only three of the five classes. See [Section 18](#18-important-source-and-deployment-discrepancies) for the live integration distinction.

### 7.1 Algorithm behavior

| Algorithm | Decision rule | Main benefit | Main trade-off |
|---|---|---|---|
| Round Robin | Select the next eligible worker in circular order. | Simple, predictable request-count distribution. | Does not consider current load or different processing durations. |
| Least Connections | Select the eligible worker with the fewest active connections. | Reacts to uneven in-flight work. | Requires accurate, timely active-connection tracking. |
| Random Selection | Choose an eligible worker randomly. | Very low state overhead. | Can produce short-term clumping or uneven bursts. |
| Weighted Round Robin | Give higher-weight workers a larger share of requests. | Models heterogeneous worker capacity. | Weights must be meaningful and supported by the active runtime. |
| IP Hash | Hash the client's IP and map it to an eligible worker index. | Repeated requests from the same IP tend to map to the same worker while the pool order is unchanged. | Pool membership/order changes can remap clients; shared NAT IPs can concentrate traffic. |

### 7.2 Backend implementations

The classes are under `backend/load-balancer/algorithms/`.

- **Round Robin:** uses a lock-protected index and selects `healthy_servers[index % len(healthy_servers)]`.
- **Least Connections:** uses Python `min()` over `active_connections`; ties retain the first worker in list order.
- **Random Selection:** uses `random.choice()` from the supplied healthy-worker list.
- **Weighted Round Robin:** expands a worker pool by repeating each worker `weight` times, then cycles through that pool. Missing weights default to `1`.
- **IP Hash:** computes an MD5 digest of the client IP string and uses the integer digest modulo the number of eligible workers.

### 7.3 Frontend simulation implementations

`src/simulation/loadBalancingAlgorithms.js` contains a separate `LoadBalancingAlgorithmManager`:

- Round Robin uses a local `roundRobinIndex`.
- Least Connections compares `activeConnections`; ties are broken using lower UI CPU value.
- Random Selection chooses a random array index.
- Weighted Round Robin uses a smooth weighted round-robin calculation with per-worker current weights.
- IP Hash uses the frontend's 32-bit rolling `hashString()` helper and modulo the eligible worker count.

The frontend's `IP_HASH` and the backend's `IPHashBalancer` do **not** use the same hash function. Likewise, frontend weighted routing and the Python weighted class use different weighting strategies.

### 7.4 Eligible worker filtering

The frontend algorithm manager excludes nodes with status `failed` or `disabled`; it permits `healthy` and `degraded` entries.

The Python gateway uses `RequestTracker.get_healthy_servers()`, which only returns nodes that are both enabled and have status `healthy`. The backend does not route to an `unhealthy`, `offline`, or disabled node.

---

## 8. Frontend simulation and live-mode workflow

### 8.1 Central state: Zustand

`src/store/simulationStore.js` owns the main application state, including:

- `isRunning`, `lbOnline`, `clusterMode`, `targetRps`, `algorithm`.
- Visualizer mode, selected node, and dark/light theme.
- Current servers, clients, and gateway metadata.
- Active visual packets.
- Aggregate metrics: total, successful, failed, current RPS, peak RPS, average latency, and active connections.
- Rolling traffic history.
- Request log and event lists.

The store also exposes actions for mode switching, algorithm selection, pause/resume, RPS adjustment, traffic spike, server add/remove/toggle/crash/recovery, weight updates, reset, packet updates, and event/log management.

### 8.2 Two operating modes

#### Dummy Simulation mode

In Dummy Sim:

1. The simulation engine runs a timer tick (configured at 120 ms intervals).
2. The target RPS is converted into requests-per-tick using an accumulator.
3. `generateMockRequest()` chooses a mock client and weighted mock endpoint.
4. The frontend `algorithmManager` selects a simulated node.
5. A synthetic latency value is calculated from UI CPU, memory/load state, active connections, and random jitter.
6. The store updates counters, events, traffic history, and logs.
7. A browser custom event (`lb-packet-event`) drives the 2D/3D visual packet animations.

No HTTP request is sent to the Azure gateway by the normal Dummy Sim tick loop.

#### Real-Time Azure / Live mode

In Live mode:

1. The frontend polls the gateway for server state and aggregate stats.
2. The frontend opens an SSE connection to `/api/stream`.
3. External traffic is generated by `send_traffic.py` or another HTTP client, or a user explicitly triggers a request/probe/burst from the interface.
4. The Flask gateway routes that real request to a configured worker.
5. The gateway emits an SSE request event when the request completes or fails.
6. The browser receives the event, converts it into a `lb-packet-event`, batches store updates, adds a log row, and updates metrics.
7. Both 2D and 3D-style visualizers react to the event and animate the packet path.

The live-mode engine deliberately does **not** dispatch continuous synthetic requests on each browser tick. Traffic must come from an external client or an explicit UI request action.

### 8.3 Explicit browser requests in Live mode

`simulationEngine.dispatchRealRequest()` sends `POST <VITE_API_BASE_URL>/api/request` when Live mode is selected and the base URL is configured. If the app is in Dummy Sim, it instead dispatches a local mock request.

The right-side studio panel exposes a one-request action and a burst action. The current burst implementation schedules 20 calls, 25 ms apart.

### 8.4 Visualizer event flow

The primary 2D and 3D-style visualizers listen for the `lb-packet-event` custom browser event. The simulation engine raises this event after receiving a live gateway SSE request event or after creating a dummy simulated request.

The 2D/3D views use shared Zustand state and the same conceptual cluster model so the user can switch the visualization without changing the request-routing system.

In the inspected source, `Visualizer3D.jsx` uses explicit isometric projection math and SVG drawing. The repository also contains a separate Three.js-based visualizer module and the Three.js dependency, but this is not the renderer imported by the main `Visualizer.jsx` page component.

### 8.5 Polling and synchronization intervals

The simulation engine currently:

- Calls `syncFromBackend()` immediately on start.
- Repeats REST synchronization approximately every `1500` ms.
- Opens an EventSource connection to the gateway `/api/stream` endpoint.
- Reconnects the SSE stream after an error with a delay.
- Runs a simulation tick every `120` ms.
- Uses a short batching window to combine live request deltas before writing them to Zustand.

---

## 9. Frontend pages and UI components

### 9.1 Main platform and visualizer

**Files:** `MainPlatformPage.jsx`, `Visualizer.jsx`, `Visualizer2D.jsx`, `Visualizer3D.jsx`, `InspectorPanel.jsx`, `SystemDesignNavbar.jsx`, `StudioRightPanel.jsx`.

Responsibilities:

- Display client/request-source nodes, load balancer, worker nodes, and animated connections.
- Offer 2D and 3D/isometric-style views.
- Allow selection of a client, gateway, or worker node.
- Show selected-node details in the inspector.
- Display algorithm choice, cluster mode, target request-rate setting, and pause/run state.
- Provide node controls and quick request/burst controls.

The inspector displays fields such as public/private display IP, status, CPU/RAM display values, active connections, average latency, handled requests, and traffic weight. These fields are a mix of backend-derived counts and UI-derived/display fields.

### 9.2 Dashboard page

**Files:** `Dashboard.jsx`, `MetricCard.jsx`, `ServerStatus.jsx`, `TrafficChart.jsx`, `SimulationControls.jsx`.

Responsibilities:

- Show aggregate request and cluster metrics.
- Provide pause/resume, reset, RPS adjustment, surge, algorithm and add-server controls.
- Show server status and a traffic history chart.
- Embed the topology visualizer and request distribution chart.

### 9.3 Monitoring dashboard

**Files:** `MonitoringDashboardPage.jsx`, `NodeFleetTable.jsx`, `MultiSeriesLineChart.tsx`, `DonutChart.jsx`, `ContributionHeatmapCard.tsx`, `RadialChart.tsx`, `Ridgeline.tsx`, `SlopeChart.tsx`, `StatusBars.jsx`, `EdgeGatewayTelemetryCard.jsx`, `LazyTelemetrySection.jsx`.

Responsibilities:

- Present KPI summaries and cluster health views.
- Show worker fleet status and search/filter controls.
- Show traffic and latency visualizations.
- Show sample ingress heatmap/diurnal charts and other custom visual reports.
- Lazy-mount lower-page chart sections to reduce initial rendering work.
- Offer traffic spike, crash-random-node, restore-fleet, and telemetry refresh controls.

**Important:** the monitoring page mixes Zustand data, static datasets, default/example node status history, and display-only edge-gateway values. Do not state that every card is directly measured from Azure. The `EdgeGatewayTelemetryCard` has hard-coded sample values, and `trafficCardData.js` contains sample date/channel series.

### 9.4 Servers page

**File:** `ServersPage.jsx`.

Displays worker cards/table data and offers local UI controls for adding/removing entries, adjusting weights, toggling state, simulating failure, and recovery. Some actions update only browser state; the page's store methods do not uniformly call the live backend. See the integration notes in Section 18.

### 9.5 Analytics page

**File:** `AnalyticsPage.jsx`.

Uses the traffic hook, simulation state, and worker state to display traffic rate, latency, distribution, and time-filtered charts. Its reliability depends on whether the current page is showing live-derived store values or seeded/sample chart values.

### 9.6 Algorithms page

**File:** `AlgorithmsPage.jsx`.

Displays the five algorithm descriptions, complexity, use cases, pros/cons, and an interactive probe dispatch control. If `VITE_API_BASE_URL` is set, the probe is posted to the gateway. Otherwise, the page runs a local algorithm-manager selection. The page currently exposes all five frontend algorithm options even though the committed Flask gateway accepts only three algorithm names.

### 9.7 Logs page

**File:** `LogsPage.jsx`.

Displays request-log rows, with text search, worker filter, status filter, pause/resume display controls, clear, and JSON export. The current UI log store is bounded independently from the gateway's in-memory 500-entry log deque.

### 9.8 Settings page

**File:** `SettingsPage.jsx`.

Exposes target RPS, algorithm selection, reset, and fields labelled REST API and WebSocket integration. The API/WS endpoint strings and the “Enable Remote REST / WebSocket API” checkbox are local component state; the save button only shows a UI success message. They do not write an environment file or reconfigure the running gateway.

---

## 10. API reference — Flask load balancer

The API routes below are defined by `backend/load-balancer/app.py`.

| Route | Method | Description |
|---|---|---|
| `/health` | GET | Gateway health summary, current algorithm, healthy-worker count and total-worker count. |
| `/gateway-health` | GET | Additional gateway health/status response. |
| `/cluster-status` | GET | Returns worker list and aggregate tracker stats. |
| `/api/stream` | GET | Server-Sent Events connection for live request, algorithm, and server-state events. |
| `/api/algorithm` | GET | Returns active algorithm and the supported algorithm list. |
| `/api/algorithm` | POST | Changes active algorithm. Body: `{"algorithm":"round_robin"}`. Unsupported algorithms return HTTP `400`. |
| `/api/simulation/config` | POST/PUT | Applies supported algorithm configuration. |
| `/api/servers` | GET | Returns server array and gateway metadata. |
| `/api/servers` | POST | Adds a worker record. Requires `id` and `url`; optional name/public/private display fields. |
| `/api/servers/{server_id}` | DELETE | Removes a worker from the tracker. |
| `/api/servers/{server_id}/toggle` | POST | Toggles worker enabled/disabled state. |
| `/api/servers/recover` | GET/POST | Marks all tracker workers enabled and healthy. |
| `/api/lb/toggle` | POST | Toggles or explicitly sets gateway pause state. Optional body: `{"paused":true}`. |
| `/api/stats` | GET | Returns aggregate and per-worker counters/metrics. |
| `/api/metrics` | GET | Alias for the stats handler. |
| `/api/logs` | GET | Returns recent request logs; `limit` is clamped to 1–500. |
| `/api/request` | GET/POST | Main gateway routing entry point. |
| `/api/process` | GET/POST | Alias for gateway routing entry point. |
| `/request` | GET/POST | Alias for gateway routing entry point. |
| `/` | GET/POST | Alias for gateway routing entry point. |
| `/api/data` | GET/POST | Alias for gateway routing entry point. |

### 10.1 Request body fields used by the gateway

| Field | Usage |
|---|---|
| `clientIp` | Preferred client IP source. Used by the IP Hash algorithm. |
| `client_ip` | Alternate client IP field. |
| `delay` | Optional delay passed to the worker processing service. |
| Other JSON fields | Passed through to the worker. |

The gateway also reads `X-Forwarded-For` when client IP is not supplied in JSON.

### 10.2 Successful routed response

The gateway response includes:

- `request_id`
- `algorithm`
- `selected_server`
- `public_ip` and `private_ip` display values
- `status`
- `response_time_ms`
- `server_exec_ms` (when returned by worker)
- `lb_dispatch_ms`
- timestamp
- nested worker `response`
- optional `failover_from` when an earlier target failed and a later candidate handled the request

### 10.3 HTTP response behavior

| Status | Meaning in the current gateway |
|---:|---|
| `200` | Worker returned HTTP 200. |
| `400` | Unsupported algorithm or malformed required add-worker data. |
| `404` | Requested worker ID was not found for worker-management routes. |
| `502` | Every attempted worker failed during routing. |
| `503` | Gateway paused, or no healthy backend worker was available. |

---

## 11. API reference — Flask backend worker

| Route | Method | Description |
|---|---|---|
| `/health` | GET | Basic worker health and identity response. |
| `/api/info` | GET | Worker identity, host/port, uptime, and `requests_handled`. |
| `/api/process` | GET/POST | Performs a request and returns the processing result. |
| `/api/request` | GET/POST | Alias. |
| `/request` | GET/POST | Alias. |
| `/` | GET/POST | Alias. |

The worker's `delay` is clamped to a maximum of 10 seconds. It is intended for testing request duration and concurrent load.

---

## 12. Real-time event and telemetry flow

### 12.1 Server-Sent Events (SSE)

The gateway exposes `/api/stream` as an SSE endpoint. Each connected browser has its own queue. The gateway broadcasts JSON data events to those queues.

The source emits event types including:

| Event type | When emitted | Frontend handling |
|---|---|---|
| `connected` | A new stream is opened. | Establishes the event stream. |
| `ping` | No event has arrived within the server-side wait interval. | Keeps the stream active. |
| `request` | A request succeeds, fails, overloads, or finds no healthy worker. | Updates request visualization, counters and logs. |
| `server_update` | A worker health state or server state changes. | Triggers backend synchronization or updates node state. |
| `algorithm` | Active algorithm changes through the gateway API. | Updates displayed algorithm state. |
| `lb_toggle` | Gateway pause state changes. | Updates frontend running/pause state. |

SSE is the active real-time gateway-to-browser mechanism in the current Python gateway implementation.

### 12.2 REST polling

The frontend periodically calls:

- `GET /api/servers`
- `GET /api/stats`

The engine maps backend worker fields into the frontend's server schema and updates Zustand. This periodic synchronization provides a snapshot; SSE provides event-driven updates.

### 12.3 Separate Vite development bridge

`vite.config.js` defines two development-server middleware endpoints:

- `/__bridge/stream` — browser EventSource stream.
- `/__bridge/event` — receives POSTed JSON and fans it out to connected browser clients.

`send_traffic.py --no-lb` uses this bridge to animate its direct-to-one-node demonstration in the local frontend. This bridge belongs to the Vite development server and is not the same service as the Flask gateway's `/api/stream` endpoint.

### 12.4 WebSocket note

`src/services/websocket.js` is a generic WebSocket client abstraction. The Python gateway inspected in this repository does not expose a WebSocket endpoint. The current live visualizer uses HTTP REST plus SSE, not a gateway WebSocket feed.

---

## 13. Traffic generator and demonstration commands

`send_traffic.py` is a Python CLI client for the gateway and the worker endpoints.

### 13.1 Main command options

| Command option | Behavior |
|---|---|
| `--url <URL>` | Sets gateway base URL. The script default is `http://127.0.0.1:5000`; set this to the reachable VM #4 URL when the script is not running on the gateway host. |
| `--rate N` / `--rps N` | Sends a continuous stream at the specified approximate requests-per-second rate. |
| `--once` | Sends one request and exits. |
| `--burst N` | Sends a concurrent burst of N requests. |
| `--stress --count N --concurrency M` | Runs a concurrent stress test and reports response totals, latency, effective throughput, and worker distribution. |
| `--delay S` | Adds a worker processing delay to each request. |
| `--algo <name>` | Changes the gateway algorithm. Current choices in the CLI parser are `round_robin`, `least_connections`, and `ip_hash`. |
| `--toggle <server-id>` | Toggles a configured worker through the gateway API. |
| `--restore` | Calls the gateway restore-all endpoint. |
| `--stats` | Prints aggregate gateway stats. |
| `--direct` | Directly probes the three hard-coded worker entries in `KNOWN_VMS`. |
| `--overload` | Runs a load pattern intended to exercise the gateway overload quarantine and failover. |
| `--no-lb` | Runs a direct-to-one-worker demonstration and sends synthetic visualization events to the Vite bridge. |
| `--with-lb` | Runs a concurrent workload through the gateway after attempting to restore workers and set Round Robin. |
| `--target` | Selects a specific worker ID for the no-LB demonstration. |
| `--bridge` | Sets the Vite development bridge URL for no-LB visual events. |
| `--demo` / `--auto` | Runs the four-act faculty demonstration, with or without interactive pauses. |

### 13.2 Typical commands

Run from the repository root after configuring a reachable gateway URL:

```bash
# One request through the Azure gateway
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --once

# Continuous traffic at approximately 5 requests/second
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --rate 5

# 100 requests using 20 worker threads
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --stress --count 100 --concurrency 20

# Add one second of processing delay per worker request
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --stress --count 100 --concurrency 20 --delay 1.0

# Switch among the three algorithms currently registered by the gateway source
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --algo round_robin
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --algo least_connections
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --algo ip_hash

# Inspect gateway statistics
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --stats

# Toggle a worker or restore the worker pool
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --toggle server-2
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --restore
```

Replace the placeholder with the actual reachable gateway address and verify the required inbound port/routing rules first.

### 13.3 No-LB versus with-LB demonstration

The CLI contains two comparison paths:

- **No-LB path:** selects one worker and sends direct HTTP requests to it. It also uses local state and Vite bridge events to represent a single-node saturation/failure scenario in the visualizer. Some post-threshold failures are generated by the CLI's local demonstration logic rather than being actual HTTP responses from a physically shut-down Azure VM.
- **With-LB path:** sends a concurrent request workload through the gateway, which selects workers and tracks the results.

The comparison is a useful demonstration of why distributing traffic can reduce concentration on a single worker. The printed success/failure summary is the result of that specific test run; it is not a guaranteed performance or uptime result.

### 13.4 Overload demonstration

`--overload` runs a baseline phase, then a high-concurrency phase with processing delay, then a post-failure request phase and a status summary. The actual server quarantine is carried out by the Flask gateway's in-memory overload guard when its configured threshold is met. It does not terminate the operating-system process or Azure VM.

---

## 14. Configuration and environment variables

The project uses environment variables, but the repository does not include a committed `.env.example` containing the real Azure deployment values. `.env` is ignored by Git.

### 14.1 Gateway configuration

The following variables are read by `backend/load-balancer/config.py`:

```env
LB_HOST=0.0.0.0
LB_PORT=5000

# Replace each value with the actual worker URL reachable from the VM #4 gateway.
BACKEND_SERVERS=server-1=http://<WORKER_1_IP>:5001,server-2=http://<WORKER_2_IP>:5001,server-3=http://<WORKER_3_IP>:5001

HEALTH_CHECK_INTERVAL=2.5
REQUEST_TIMEOUT=4.0
OVERLOAD_MAX_CONNS=12
OVERLOAD_COOLDOWN_SEC=20.0
```

`BACKEND_SERVERS` is a comma-separated list of `server-id=URL` pairs. It changes the target URLs used by the gateway. The current config module also has static sample metadata for known IDs, including placeholder private addresses. Do not assume those metadata values match Azure.

### 14.2 Worker configuration

Set a unique worker identity on each worker process:

```env
SERVER_ID=server-1
HOST=0.0.0.0
PORT=5001
```

Use a distinct `SERVER_ID` for each configured worker. The gateway's IDs in `BACKEND_SERVERS` must correspond to the worker IDs used for administration and display.

### 14.3 Local frontend configuration

For the current arrangement where the frontend runs locally and the gateway runs on Azure VM #4, create a local `.env` file in the frontend repository root:

```env
VITE_CLUSTER_MODE=live
VITE_API_BASE_URL=http://<LB_VM4_PUBLIC_IP>:5000
```

Notes:

- `VITE_API_BASE_URL` is the important frontend-to-gateway setting used by the engine and Zustand store.
- The current engine/store fallback is `http://localhost:5000`. Without a correct environment override, the browser will try to contact a gateway on the local machine instead of the Azure VM.
- Vite environment variables are read when the dev server/build starts; restart Vite after changing `.env`.
- `VITE_WS_URL` is used by the optional WebSocket abstraction, but the current Flask gateway uses SSE.
- `VITE_AZURE_LB_HOST` appears in the additional `liveStoreBridge.js` helper but is not the primary environment variable used by the active simulation engine.

### 14.4 Current source configuration caveats

- `backend/load-balancer/config.py` has sample public worker URLs and sample private IP metadata.
- `src/simulation/serverManager.js` has sample server IPs and sample private addresses.
- `send_traffic.py` has a hard-coded `KNOWN_VMS` dictionary used by direct probes and the no-LB demonstration.
- The gateway's response payload includes hard-coded gateway/private-network display values in several endpoints.
- Actual IP addresses and the real subnet are not supplied in this document and should be set in the deployment configuration.

---

## 15. Deployment and startup workflow

This section is a source-aligned runbook. It uses placeholders because the real IP addresses and current network rules were not supplied.

### 15.1 Prepare the load balancer on Azure VM #4

1. Connect to Azure VM #4 using the approved SSH method.
2. Ensure Python is installed.
3. Copy or clone the project source onto the VM.
4. Create and activate a Python virtual environment.
5. Install gateway dependencies.
6. Configure `LB_HOST`, `LB_PORT`, and `BACKEND_SERVERS` using the real worker endpoints.
7. Configure health-check and overload settings if required.
8. Ensure the gateway VM can reach each configured worker on its worker port.
9. Start the gateway from the `backend/load-balancer` directory.

Example:

```bash
cd backend/load-balancer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Export the real deployment values in the shell or a protected service environment.
export LB_HOST=0.0.0.0
export LB_PORT=5000
export BACKEND_SERVERS='server-1=http://<WORKER_1_IP>:5001,server-2=http://<WORKER_2_IP>:5001,server-3=http://<WORKER_3_IP>:5001'

python app.py
```

Do not start the gateway with the sample worker addresses left in the source config.

### 15.2 Prepare a worker service (only on hosts that are actually backend workers)

If the three VM hosts are serving as backend workers, configure and run `backend/backend-server` on each one with its own `SERVER_ID` and listening port:

```bash
cd backend/backend-server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export SERVER_ID=server-1
export HOST=0.0.0.0
export PORT=5001
python app.py
```

Repeat with a unique ID for each worker. If the three VMs are client generators rather than workers, do not deploy the worker service on them merely because the repository contains a worker application; identify the actual target hosts for `BACKEND_SERVERS` first.

### 15.3 Verify the gateway and worker services

From a host that can reach the gateway:

```bash
curl http://<LB_VM4_PUBLIC_IP>:5000/health
curl http://<LB_VM4_PUBLIC_IP>:5000/api/algorithm
curl http://<LB_VM4_PUBLIC_IP>:5000/api/servers
curl http://<LB_VM4_PUBLIC_IP>:5000/api/stats
```

From the gateway host, verify each configured worker directly:

```bash
curl http://<WORKER_IP>:5001/health
curl http://<WORKER_IP>:5001/api/info
```

Then send one request through the gateway:

```bash
curl -X POST http://<LB_VM4_PUBLIC_IP>:5000/api/request \
  -H 'Content-Type: application/json' \
  -d '{"clientIp":"198.51.100.25"}'
```

The sample client IP is a documentation/test value only.

### 15.4 Start the local React frontend

On the development machine:

```bash
npm install
```

Create the `.env` values shown in Section 14.3, then run:

```bash
npm run dev
```

Open the Vite development URL shown by the terminal (the default project port is `5173`). Select **Real-Time Azure** mode. The browser must be able to reach the gateway URL over the network, and the gateway CORS rules/NSG must allow the required traffic.

### 15.5 Start external traffic

From a request-generating client host with network access to VM #4:

```bash
python send_traffic.py --url http://<LB_VM4_PUBLIC_IP>:5000 --rate 5
```

The local browser should receive the gateway SSE events and animate the corresponding packets.

---

## 16. Testing and CI

### 16.1 Backend worker tests

`backend/backend-server/tests/test_app.py` covers:

- `/health` returns HTTP 200 and includes status, server ID, and timestamp.
- `/api/info` returns server ID, request count, and uptime.
- `/api/process` returns a successful response and reflects a requested processing delay.

### 16.2 Load balancer tests

`backend/load-balancer/tests/test_load_balancer.py` covers:

- Gateway health and initial server list.
- Round Robin distribution across three test workers.
- Least Connections selection based on configured active-connection values.
- Exclusion of an unhealthy worker from routing.
- Aggregate stats and request-log recording.

The tests mock the gateway's outbound `requests.post`; they do not contact live Azure VMs.

### 16.3 GitHub Actions

`.github/workflows/backend-ci.yml` runs backend CI on Ubuntu using Python `3.13`. It installs dependencies and runs pytest for the worker and load-balancer projects when backend/workflow paths change.

### 16.4 Test coverage not present in the inspected repository

The current tests do not show coverage for:

- Live Azure networking or actual Azure resource state.
- All five algorithm variants.
- Gateway IP Hash behavior.
- Random or weighted backend selection.
- End-to-end failover across real worker hosts.
- Circuit-breaker/overload behavior under concurrent live requests.
- SSE reconnect and browser visualization integration.
- Frontend automated tests.
- Browser-to-Azure CORS/NSG configuration.

No test execution was performed as part of this source review; the items above describe the tests present in the repository.

---

## 17. Security, reliability, and operational considerations

1. **CORS:** the gateway currently allows all origins (`*`). For a deployed system, restrict allowed origins to the actual frontend origin where practical.
2. **Network access:** expose the gateway port only to intended clients/frontend access. Worker ports should be reachable from the gateway and should not be opened broadly unless the deployment design requires it.
3. **No authentication:** the inspected gateway endpoints do not implement authentication or authorization. Anyone who can reach the gateway may be able to switch algorithms, toggle workers, pause the gateway, inspect logs, or send traffic.
4. **No TLS configuration in Flask code:** use an HTTPS reverse proxy or an appropriate TLS termination setup if the service is exposed beyond a trusted test network.
5. **No persistence:** worker counts, gateway stats, and logs are stored in process memory and reset on restart.
6. **No Azure control-plane integration:** the gateway checks HTTP health endpoints; it does not query Azure Resource Manager or start/stop/deallocate VMs.
7. **CPU/RAM telemetry:** add an actual host-metrics exporter/agent or extend worker health responses before presenting CPU/RAM cards as measured Azure metrics.
8. **Timeouts and retries:** tune `REQUEST_TIMEOUT`, health probe timeout/interval, and overload cooldown based on actual worker latency and network behavior.
9. **Client IP trust:** `X-Forwarded-For` and the JSON client-IP fields are accepted as routing inputs. If the gateway is behind another proxy, configure trusted proxy behavior rather than trusting arbitrary client-supplied values.
10. **Process supervision:** the example `app.run()` invocation is a development/simple runtime entry. Use a process manager and production WSGI deployment pattern for a more reliable service lifecycle.

---

## 18. Important source and deployment discrepancies

This section is intentionally explicit. It prevents the documentation from presenting a feature as live Azure functionality when the committed code does not yet wire it that way.

### 18.1 Azure VM roles: owner statement versus repository model

The owner stated that VM #4 hosts the load balancer and the other three Azure VMs are clients. The current Python application treats `server-1`, `server-2`, and `server-3` as worker targets and forwards requests to `/api/process` on them. Confirm whether the other three hosts are actually running the backend worker application or whether the deployed target pool is elsewhere.

### 18.2 Five algorithms in the frontend, three registered in the gateway

The frontend `ALGORITHM_INFO` and local algorithm manager contain:

1. Round Robin
2. Least Connections
3. Random Selection
4. Weighted Round Robin
5. IP Hash

The Python gateway imports five classes but its active `balancers` dictionary currently registers only:

- `round_robin`
- `least_connections`
- `ip_hash`

The Python Random and Weighted Round Robin classes exist but are not active in that dictionary. The gateway's `/api/algorithm` endpoint reports only the registered names. The `send_traffic.py --algo` parser also permits only those three names.

The project owner indicated that algorithms are enabled in the deployed setup. That deployed state may be ahead of the inspected repository commit, but the current `main` source does not confirm all five as active live algorithms.

### 18.3 Weighted Round Robin backend data is incomplete

Even if the Python weighted class is added to the active registry, the current `RequestTracker` worker records do not initialize or serialize a `weight` field. The Python weighted class therefore falls back to weight `1` for each worker unless the tracker data model is extended.

The frontend weighted algorithm does use `weight` on the local server objects, but changing a weight in the UI does not update the Python gateway's tracker through a corresponding API field/action.

### 18.4 UI algorithm selection can diverge from the live gateway

The Zustand `setAlgorithm` action updates frontend state first and then POSTs the lower-case algorithm name to the gateway. If the gateway rejects a frontend-only algorithm with HTTP `400`, the UI can still display the new algorithm because the response status is not used to roll back the state.

Therefore, the algorithm shown in a frontend control is not, by itself, proof that the live gateway accepted that algorithm. Verify with `GET /api/algorithm` or the CLI after switching.

### 18.5 Source IP metadata and subnet examples are placeholders

The following source values are not the current deployment configuration according to the project owner:

- `10.0.1.0/24` and associated `10.0.1.x` addresses.
- Public worker IPs in `backend/load-balancer/config.py`.
- The `DEFAULT_SERVERS` and `GATEWAY_INFO` metadata.
- `DEFAULT_SERVERS` in `src/simulation/serverManager.js`.
- The `KNOWN_VMS` mapping in `send_traffic.py`.
- Old VM numbers, region labels, and hostnames in the deployment guides.

Use the actual deployment configuration, not these checked-in sample values.

### 18.6 Older deployment guides describe different architectures

The repository contains multiple older documents that do not match the latest owner-provided setup or the current Python gateway source:

- `AZURE_BACKEND_INTEGRATION_GUIDE.md` describes an NGINX gateway on VM 1 and Node.js workers on ports `8081`–`8083`; it is an earlier/reference architecture, not the current Python Flask gateway implementation.
- `AZURE_CLUSTER_DEVELOPER_GUIDE.md` describes the Python gateway as local/VM 1 and lists sample VM addresses.
- `DEMO_COMMANDS.md` also describes a localhost gateway and old public/private sample addresses.

Do not use those old host/IP tables as the source of truth for the current Azure deployment.

### 18.7 Live telemetry is partly estimated/sample data

The backend worker `/health` does not report CPU, RAM, or live socket counts. The frontend maps backend fields and estimates CPU from active connection/request counts; memory is retained or defaulted in UI mapping. Some monitoring chart sources use static sample arrays and status/incident records.

Until host-level telemetry is implemented, label CPU/RAM and sample chart values as estimated/demo data, not measured Azure VM utilization.

### 18.8 Some UI actions are local-only

The store actions do not all have equivalent live backend operations:

- `toggleServerStatus` sends a POST to the gateway toggle endpoint.
- `addServer` and `removeServer` update Zustand locally; the corresponding `apiService` methods exist, but the store/page paths reviewed do not call those service methods.
- `failServer`, `recoverServer`, and `recoverAllServers` update frontend state locally; they are not equivalent to stopping/restarting an Azure VM.
- `updateServerWeight` updates the local UI object only.
- `resetSimulation` resets browser state; it does not clear server processes or durable remote storage.

The gateway itself supports adding/removing/toggling/recovering tracker entries through REST endpoints, but the frontend does not uniformly call those endpoints from all visible controls.

### 18.9 Pause does not stop the health-check thread in the current code

The gateway toggle handler checks for a `paused` property on the `HealthChecker`, but the current `HealthChecker` class does not define that property or use it in its loop. The pause flag rejects incoming routed requests; it does not stop the periodic health-check thread.

### 18.10 Frontend API base URL must be set for the local-to-Azure arrangement

The engine and store default to `http://localhost:5000`. In the current deployment arrangement (frontend local, gateway on Azure VM #4), configure `VITE_API_BASE_URL` to the actual reachable VM #4 gateway URL. The Vite `/api` development proxy targets localhost and is not a replacement for setting the remote base URL when the engine uses absolute fetch URLs.

### 18.11 Direct-probe/no-LB CLI mappings need updating

The `--direct` and `--no-lb` features use the hard-coded `KNOWN_VMS` dictionary. Update this mapping or refactor it to load actual addresses from configuration before relying on those modes with the present Azure deployment.

### 18.12 Settings and WebSocket controls are not a live configuration plane

The Settings page stores REST/WS endpoint fields in local React state and shows a save confirmation; it does not persist or apply those values to the app runtime. The current gateway supports SSE, not a WebSocket route.

---

## 19. Suggested next engineering improvements

These are recommendations, not claims about already-completed work:

1. Reconcile the VM role mapping and set the gateway's `BACKEND_SERVERS` to the real worker hosts.
2. Make the Python live gateway registry match the exact algorithms intended for the deployed demo; expose only algorithms the gateway actually accepts.
3. Add `weight` to tracker worker records and API update semantics if Weighted Round Robin is to operate live.
4. Make frontend algorithm changes wait for/validate the gateway response and revert the UI on failure.
5. Replace all sample public/private IP data with a single environment-driven configuration source.
6. Refactor `send_traffic.py` to read worker metadata and gateway URL from environment/config instead of hard-coded addresses.
7. Add actual CPU/RAM/host metrics to worker telemetry or clearly label UI estimates.
8. Wire UI add/remove/fail/recover/weight controls to actual gateway endpoints, or label them as simulation-only.
9. Add integration tests for IP Hash, all enabled algorithms, overload quarantine, multi-worker failover, SSE delivery, and the remote frontend-to-gateway connection.
10. Add authentication, origin restriction, secure transport, and appropriate network restrictions before exposing management endpoints publicly.
11. Replace the older architecture documents with one current deployment guide so the VM numbering, region, ports, and networking story do not conflict.
12. Add a production process manager/deployment unit and health-check/runbook for the gateway and each worker process.

---

## 20. Glossary

| Term | Meaning in this project |
|---|---|
| Client/request producer | A browser, CLI process, or external host that submits requests to the gateway. |
| Load Balancer Gateway | Flask application that selects a worker and forwards incoming requests. |
| Backend worker | Flask process that receives `/api/process` requests and returns a processed response. |
| Eligible worker | A worker currently enabled and marked healthy by the gateway tracker. |
| Active connection | A request currently tracked as in flight for a selected worker. |
| RPS | Requests per second. |
| SSE | Server-Sent Events; one-way server-to-browser event stream over HTTP. |
| Failover | Retrying a request against another eligible worker after the originally selected worker fails. |
| Quarantine | Marking a worker unhealthy in the gateway tracker for a period so new requests avoid it. |
| Dummy Sim | Browser-only simulation using generated clients, mock requests, calculated latency, and local state. |
| Live mode | Frontend mode that synchronizes with the Flask gateway and visualizes real gateway request events. |

---

## 21. Final architecture summary

LOADFLOW combines a Flask-based HTTP load balancer and worker service with a React visualization and analytics interface. The gateway performs the real routing, health checks, request tracking, algorithm selection, retry/failover, and SSE event generation. The React application provides the topology visualizer, control panels, monitoring pages, charts, and a separate local simulation engine.

For the current deployment arrangement, the frontend is run locally and must point to the gateway running on Azure VM #4 using `VITE_API_BASE_URL`. The actual Azure IP addresses and private network range must come from the live Azure environment; the old addresses and `10.0.1.0/24` values in the repository are not authoritative.

The source review also identifies items that must remain visible in any technical presentation: the owner-described roles of the other three Azure VMs differ from the roles encoded in the current worker-pool implementation; only three algorithms are registered in the inspected Flask gateway even though five are implemented in the frontend and represented by Python classes; and parts of the monitoring UI show estimated or sample values. Resolve or explicitly disclose these points before claiming that every UI feature is a live Azure capability.
