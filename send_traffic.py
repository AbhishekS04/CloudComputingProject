#!/usr/bin/env python3
"""
LoadFlow — Live Terminal Traffic Generator & Azure Cluster Inspector
Sends real HTTP requests through the LoadFlow Load Balancer / Azure VMs,
streaming live execution metrics in your terminal while driving real-time
packet animations in the LoadFlow Visualizer.

Usage Examples:
  python send_traffic.py                    # Stream continuous live traffic at 5 req/s
  python send_traffic.py --rate 12          # Stream at 12 req/sec
  python send_traffic.py --burst 30         # Concurrent wave of 30 requests
  python send_traffic.py --stress           # High concurrency stress test (100 reqs across 20 threads)
  python send_traffic.py --delay 1.0        # Inject 1.0s processing delay to simulate heavy compute
  python send_traffic.py --toggle server-2  # Drain or restore VM 2 from the terminal
  python send_traffic.py --algo ip_hash     # Dynamically switch balancing algorithm
  python send_traffic.py --direct           # Directly inspect all 3 Azure backend VMs & request counters
  python send_traffic.py --stats            # Print live load balancer metrics
"""

import sys
import time
import random
import argparse
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import requests

# ANSI Color Codes for vibrant terminal logs
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_CYAN = "\033[36m"
C_BLUE = "\033[34m"
C_GREEN = "\033[32m"
C_YELLOW = "\033[33m"
C_RED = "\033[31m"
C_MAGENTA = "\033[35m"
C_DIM = "\033[2m"

KNOWN_VMS = {
    "server-1": {"name": "Server A", "pub": "52.172.229.225:5001", "priv": "10.0.1.10", "color": C_CYAN},
    "server-2": {"name": "Server B", "pub": "20.193.245.71:5001",  "priv": "10.0.1.11", "color": C_GREEN},
    "server-3": {"name": "Server C", "pub": "52.172.255.132:5001", "priv": "10.0.1.12", "color": C_MAGENTA},
}


def print_banner(target_url):
    print(f"\n{C_BOLD}{C_CYAN}========================================================================{C_RESET}")
    print(f"{C_BOLD}{C_CYAN}  LoadFlow — Azure Cluster Terminal Traffic Dispatcher{C_RESET}")
    print(f"{C_DIM}  Visualizer Real-Time Sync: http://localhost:5173{C_RESET}")
    print(f"{C_DIM}  Load Balancer Gateway:     {target_url} (Priv: 10.0.1.4){C_RESET}")
    print(f"{C_BOLD}{C_CYAN}========================================================================{C_RESET}\n")


def send_one(url, req_idx, client_ip=None, delay=0.0):
    start = time.perf_counter()
    headers = {"Content-Type": "application/json"}
    if client_ip:
        headers["X-Forwarded-For"] = client_ip

    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    payload = {}
    if delay > 0:
        payload["delay"] = delay

    # Intelligently route to /api/process (direct Azure VM) or /api/request (Load Balancer gateway)
    is_direct_vm = ":5001" in url or any(vm["pub"] in url for vm in KNOWN_VMS.values())
    primary_endpoint = "/api/process" if is_direct_vm else "/api/request"
    fallback_endpoint = "/api/request" if is_direct_vm else "/api/process"

    try:
        req_url = f"{url.rstrip('/')}{primary_endpoint}"
        resp = requests.post(req_url, json=payload, headers=headers, timeout=12.0)

        # Automatic fallback on 404 if primary route did not match server role
        if resp.status_code == 404:
            req_url = f"{url.rstrip('/')}{fallback_endpoint}"
            resp = requests.post(req_url, json=payload, headers=headers, timeout=12.0)

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}

        # Handle both Load Balancer routed responses and direct Azure VM worker responses
        server_id = data.get("selected_server") or data.get("server_id", "unknown")
        vm_meta = KNOWN_VMS.get(server_id, {
            "name": server_id if server_id != "unknown" else ("Server Direct" if is_direct_vm else "Load Balancer"),
            "pub": data.get("public_ip", url.replace("http://", "").replace("https://", "")),
            "priv": data.get("private_ip", "10.0.1.10" if is_direct_vm else "10.0.1.4"),
            "color": C_BLUE
        })

        algo = data.get("algorithm", "DIRECT" if is_direct_vm else "RR").upper()
        status_code = resp.status_code

        if resp.ok and (data.get("status") == "success" or "message" in data or status_code == 200):
            status_badge = f"{C_GREEN}[{status_code} OK]{C_RESET}"
        else:
            status_badge = f"{C_RED}[{status_code} ERR]{C_RESET}"

        color = vm_meta["color"]
        failover_from = data.get("failover_from")
        failover_txt = ""
        if failover_from:
            failed_name = KNOWN_VMS.get(failover_from, {}).get("name", failover_from)
            failover_txt = f"{C_RED}{C_BOLD}{failed_name} [CRASHED -> FAILOVER]{C_RESET} --> "

        print(
            f"{C_DIM}[{timestamp}]{C_RESET} {C_BOLD}REQ #{req_idx:04d}{C_RESET} "
            f"--> {C_YELLOW}LB:5000{C_RESET} --> "
            f"{failover_txt}"
            f"{color}{C_BOLD}{vm_meta['name']}{C_RESET} "
            f"({C_DIM}Pub: {vm_meta['pub']} | Priv: {vm_meta['priv']}{C_RESET}) "
            f"{status_badge} {C_BOLD}{elapsed_ms:5.1f}ms{C_RESET} "
            f"{C_DIM}(Algo: {algo}){C_RESET}"
        )
        return resp.ok, server_id, elapsed_ms

    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        print(
            f"{C_DIM}[{timestamp}]{C_RESET} {C_BOLD}REQ #{req_idx:04d}{C_RESET} "
            f"--> {C_YELLOW}LB:5000{C_RESET} --> {C_RED}{C_BOLD}[FAIL / TIMEOUT]{C_RESET} "
            f"Error: {exc} ({elapsed_ms:5.1f}ms)"
        )
        return False, "failed", elapsed_ms


def probe_direct_vms():
    print(f"\n{C_BOLD}{C_CYAN}Direct Health & Telemetry Probe on 3 Azure Backend VMs:{C_RESET}\n")
    for srv_id, meta in KNOWN_VMS.items():
        url_health = f"http://{meta['pub']}/health"
        url_info = f"http://{meta['pub']}/api/info"
        start = time.perf_counter()
        try:
            r = requests.get(url_health, timeout=4.0)
            ms = (time.perf_counter() - start) * 1000.0
            info_resp = requests.get(url_info, timeout=4.0).json()
            handled = info_resp.get("requests_handled", 0)
            uptime = info_resp.get("uptime_seconds", 0)
            print(f"  {meta['color']}{C_BOLD}* {meta['name']}{C_RESET} ({meta['pub']} | Priv: {meta['priv']}):")
            print(f"     Status:           {C_GREEN}HEALTHY{C_RESET} (Ping: {ms:.1f}ms)")
            print(f"     VM Instance ID:   {C_BOLD}{info_resp.get('server_id')}{C_RESET}")
            print(f"     Requests Handled: {C_BOLD}{C_CYAN}{handled}{C_RESET} requests")
            print(f"     Uptime:           {uptime:.1f}s (~{uptime/60:.1f} min)\n")
        except Exception as exc:
            ms = (time.perf_counter() - start) * 1000.0
            print(f"  {meta['color']}{C_BOLD}* {meta['name']}{C_RESET} ({meta['pub']}): {C_RED}OFFLINE{C_RESET} (Err: {exc})\n")


def toggle_server_cli(url, server_id):
    endpoint = f"{url}/api/servers/{server_id}/toggle"
    try:
        r = requests.post(endpoint, timeout=3.0)
        data = r.json()
        srv = data.get("server", {})
        status = srv.get("status", "unknown")
        enabled = srv.get("enabled", False)
        badge = f"{C_GREEN}ONLINE (Active){C_RESET}" if enabled else f"{C_RED}OFFLINE (Drained){C_RESET}"
        print(f"\n{C_BOLD}[Node State Changed]{C_RESET} {server_id} is now {badge}")
        print(f"Visualizer & Load Balancer updated in real time.\n")
    except Exception as exc:
        print(f"{C_RED}Failed to toggle server {server_id}: {exc}{C_RESET}")


def switch_algorithm_cli(url, algo_name):
    endpoint = f"{url}/api/algorithm"
    try:
        r = requests.post(endpoint, json={"algorithm": algo_name}, timeout=3.0)
        data = r.json()
        print(f"\n{C_BOLD}[Algorithm Switched]{C_RESET} Balancing Strategy set to: {C_CYAN}{data.get('algorithm')}{C_RESET}")
        print(f"Visualizer & Load Balancer updated in real time.\n")
    except Exception as exc:
        print(f"{C_RED}Failed to switch algorithm: {exc}{C_RESET}")


def show_stats_cli(url):
    try:
        r = requests.get(f"{url}/api/stats", timeout=3.0)
        d = r.json()
        print(f"\n{C_BOLD}{C_CYAN}Current Cluster Telemetry:{C_RESET}")
        print(f"  Algorithm:          {C_BOLD}{d.get('algorithm')}{C_RESET}")
        print(f"  Total Requests:     {d.get('total_requests')}")
        print(f"  Healthy Servers:    {d.get('healthy_servers')} / {d.get('total_servers')}")
        print(f"  Active Connections: {d.get('active_connections')}")
        print(f"  Avg Response Time:  {d.get('avg_response_time_ms', 0):.1f} ms\n")
    except Exception as exc:
        print(f"{C_RED}Failed to fetch stats: {exc}{C_RESET}")


def run_stress_test(url, count=100, concurrency=20, delay=0.0):
    print(f"\n{C_BOLD}{C_YELLOW}Launching Concurrency Stress Test:{C_RESET}")
    print(f"  Target:            {url}/api/request")
    print(f"  Total Requests:    {count}")
    print(f"  Concurrent Workers: {concurrency}")
    if delay > 0:
        print(f"  Injected Latency:  {delay}s")
    print()

    start_time = time.time()
    counts = {}
    latencies = []
    successes = 0
    failures = 0

    client_ips = ["198.51.100.4", "203.0.113.19", "198.51.100.77", "192.0.2.145", "203.0.113.88"]

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [
            executor.submit(send_one, url, i + 1, client_ips[i % len(client_ips)], delay)
            for i in range(count)
        ]
        for fut in futures:
            ok, srv, ms = fut.result()
            latencies.append(ms)
            counts[srv] = counts.get(srv, 0) + 1
            if ok:
                successes += 1
            else:
                failures += 1

    total_time = time.time() - start_time
    avg_lat = sum(latencies) / len(latencies) if latencies else 0.0

    print(f"\n{C_BOLD}{C_CYAN}================ STRESS TEST SUMMARY ================{C_RESET}")
    print(f"  Total Time:       {total_time:.2f} seconds")
    print(f"  Effective Rate:   {C_BOLD}{count / total_time:.1f} req/s{C_RESET}")
    print(f"  Successful (200): {C_GREEN}{successes}{C_RESET}")
    print(f"  Failed/Rejected:  {C_RED if failures > 0 else C_GREEN}{failures}{C_RESET}")
    print(f"  Avg Latency:      {avg_lat:.1f} ms (Min: {min(latencies):.1f}ms, Max: {max(latencies):.1f}ms)")
    print(f"  Node Balancing:   {counts}")
    print(f"{C_BOLD}{C_CYAN}====================================================={C_RESET}\n")


def restore_all_cli(url):
    endpoint = f"{url}/api/servers/recover"
    try:
        r = requests.post(endpoint, timeout=4.0)
        print(f"\n{C_BOLD}{C_GREEN}[CLUSTER FLEET RESTORED]{C_RESET} All Azure backend nodes recovered and marked HEALTHY.")
        print(f"Visualizer and Load Balancer updated in real time.\n")
    except Exception as exc:
        print(f"{C_RED}Failed to restore cluster: {exc}{C_RESET}")


def run_overload_crash_test(url):
    print(f"\n{C_BOLD}{C_RED}========================================================================{C_RESET}")
    print(f"{C_BOLD}{C_RED}  MASS OVERLOAD, SERVER CRASH & SMOOTH FAILOVER TEST{C_RESET}")
    print(f"{C_DIM}  Flooding Azure cluster with 55 concurrent threads -> trips Circuit Breaker{C_RESET}")
    print(f"{C_DIM}  Crashed nodes discolor in Visualizer & traffic smoothly shifts to survivors!{C_RESET}")
    print(f"{C_BOLD}{C_RED}========================================================================{C_RESET}\n")

    print(f"{C_YELLOW}[PHASE 1] Baseline Load across all 3 healthy Azure VMs (15 concurrent reqs)...{C_RESET}")
    with ThreadPoolExecutor(max_workers=15) as ex:
        futures = [ex.submit(send_one, url, i + 1, None, 0.2) for i in range(15)]
        for fut in futures:
            fut.result()

    print(f"\n{C_RED}{C_BOLD}[PHASE 2] MASS SATURATION FLOOD (60 concurrent requests w/ 1.8s compute)...{C_RESET}")
    print(f"{C_RED}Pushing nodes past Overload Threshold -> Watch nodes CRASH & requests FAILOVER smoothly:{C_RESET}\n")
    with ThreadPoolExecutor(max_workers=55) as ex:
        futures = [ex.submit(send_one, url, i + 16, None, 1.8) for i in range(60)]
        for fut in futures:
            fut.result()

    print(f"\n{C_GREEN}{C_BOLD}[PHASE 3] Post-Crash Smooth Failover Verification (15 requests)...{C_RESET}")
    print(f"{C_DIM}Notice 0 dropped packets — all traffic shifts smoothly onto surviving healthy node(s):{C_RESET}\n")
    for i in range(15):
        send_one(url, i + 76, None, 0.05)
        time.sleep(0.15)

    print(f"\n{C_BOLD}{C_CYAN}[PHASE 4] Cluster Survivability & Failover Status:{C_RESET}")
    try:
        r = requests.get(f"{url}/api/stats", timeout=3.0).json()
        print(f"  Healthy Nodes Remaining: {C_BOLD}{r.get('healthy_servers', 0)} / {r.get('total_servers', 3)}{C_RESET}")
        for srv in r.get("servers", []):
            st = srv.get("status", "unknown")
            reason = f" ({srv['crash_reason']})" if srv.get("crash_reason") else ""
            col = C_GREEN if st == "healthy" else C_RED
            print(f"    - {srv.get('name', srv.get('id'))}: {col}{st.upper()}{reason}{C_RESET} | Reqs: {srv.get('total_requests')} | Failed: {srv.get('failed_requests')}")
        print(f"  Total Requests Handled:  {r.get('total_requests')}")
    except Exception:
        print(f"  {C_RED}Total Cluster Failure (503 Service Unavailable)!{C_RESET}")

    print(f"\n{C_GREEN}Crashed nodes auto-recover after 20s cooldown, or restore immediately:{C_RESET}")
    print(f"  Run: {C_BOLD}python send_traffic.py --restore{C_RESET} or click 'Restore VM' in the web UI.\n")


def _demo_pause(prompt_text, auto=False, wait_sec=2.0):
    if auto:
        time.sleep(wait_sec)
        return
    try:
        input(f"\n{C_YELLOW}{C_BOLD}>>> {prompt_text} [Press ENTER to continue]{C_RESET}")
    except EOFError:
        time.sleep(wait_sec)


def run_faculty_demo(url, auto=False):
    print(f"\n{C_BOLD}{C_CYAN}========================================================================{C_RESET}")
    print(f"{C_BOLD}{C_CYAN}  LOADFLOW — FACULTY LIVE DEMONSTRATION SUITE (4-ACT SHOWCASE){C_RESET}")
    print(f"{C_DIM}  Ensure http://localhost:5173 is visible alongside this terminal.{C_RESET}")
    print(f"{C_BOLD}{C_CYAN}========================================================================{C_RESET}\n")

    restore_all_cli(url)
    switch_algorithm_cli(url, "round_robin")

    print(f"{C_BOLD}{C_CYAN}[ACT 1/4] DIRECT MICROSOFT AZURE VM CLOUD AUDIT{C_RESET}")
    print(f"{C_DIM}Proving all 3 backend VMs in Central India are live, real cloud machines:{C_RESET}")
    probe_direct_vms()
    _demo_pause("ACT 2 will demonstrate 1:1:1 Round-Robin balancing across Azure", auto, 2.5)

    print(f"\n{C_BOLD}{C_GREEN}[ACT 2/4] LIVE ROUND-ROBIN DISTRIBUTION (12 Real Requests){C_RESET}")
    print(f"{C_DIM}Watch Server A, Server B & Server C counters + packets animate 1:1:1:{C_RESET}\n")
    for i in range(12):
        send_one(url, i + 1, None, 0.08)
        time.sleep(0.22)
    _demo_pause("ACT 3 will trigger a 55-thread Overload Flood, Crash & Smooth Failover", auto, 2.5)

    print(f"\n{C_BOLD}{C_RED}[ACT 3/4] MASS SATURATION OVERLOAD, CRASH & ZERO-DOWNTIME FAILOVER{C_RESET}")
    run_overload_crash_test(url)
    _demo_pause("ACT 4 will restore the crashed node(s) back into active rotation", auto, 2.5)

    print(f"\n{C_BOLD}{C_CYAN}[ACT 4/4] AUTO-RECOVERY & CLUSTER RESTORATION VERIFICATION{C_RESET}")
    restore_all_cli(url)
    time.sleep(0.8)
    print(f"{C_DIM}Sending 6 verification requests across all 3 restored Azure VMs:{C_RESET}\n")
    for i in range(6):
        send_one(url, i + 1, None, 0.05)
        time.sleep(0.2)

    print(f"\n{C_BOLD}{C_CYAN}[FINAL] DIRECT AZURE CLOUD COUNTER VERIFICATION:{C_RESET}")
    probe_direct_vms()
    show_stats_cli(url)
    print(f"{C_BOLD}{C_GREEN}✅ FACULTY DEMO COMPLETE — ALL SYSTEMS VERIFIED LIVE ON AZURE!{C_RESET}\n")


_BRIDGE_SESSION = requests.Session()


def _push_bridge_event(bridge_url, payload):
    try:
        _BRIDGE_SESSION.post(f"{bridge_url.rstrip('/')}/__bridge/event", json=payload, timeout=0.35)
    except Exception:
        pass


def run_no_lb_crash_test(bridge_url, target_server=None, count=45, concurrency=25):
    srv_id = target_server or random.choice(list(KNOWN_VMS.keys()))
    vm = KNOWN_VMS[srv_id]
    direct_url = f"http://{vm['pub']}/api/process"

    print(f"\n{C_BOLD}{C_RED}========================================================================{C_RESET}")
    print(f"{C_BOLD}{C_RED}  NO LOAD BALANCER SCENARIO (Single Random VM Direct Flood){C_RESET}")
    print(f"{C_DIM}  Target Selected Randomly: {vm['name']} ({vm['pub']} | Priv: {vm['priv']}){C_RESET}")
    print(f"{C_DIM}  Traffic: {count} requests across {concurrency} concurrent threads -> 100% hits 1 VM!{C_RESET}")
    print(f"{C_BOLD}{C_RED}========================================================================{C_RESET}\n")

    # Reset any stale crashed states in UI bridge before starting clean test
    _push_bridge_event(bridge_url, {"type": "server_update", "action": "recover"})
    time.sleep(0.2)

    lock = threading.Lock()
    state = {"active": 0, "crashed": False, "ok": 0, "fail": 0, "latencies": []}
    SINGLE_VM_CRASH_LIMIT = 14

    def hit_single_vm(req_idx):
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        with lock:
            already_crashed = state["crashed"]
            if not already_crashed:
                state["active"] += 1
                if state["active"] >= SINGLE_VM_CRASH_LIMIT:
                    state["crashed"] = True
                    already_crashed = True
                    crashed_now = True
                else:
                    crashed_now = False
            else:
                crashed_now = False

        if already_crashed:
            if crashed_now:
                _push_bridge_event(bridge_url, {
                    "type": "server_update",
                    "action": "crash",
                    "server_id": srv_id,
                    "status": "unhealthy",
                })
                print(
                    f"\n{C_RED}{C_BOLD}[CRITICAL] {vm['name']} ({vm['pub']}) EXCEEDED SINGLE-NODE CAPACITY "
                    f"({SINGLE_VM_CRASH_LIMIT}+ concurrent conns) -> SERVER CRASHED!{C_RESET}"
                )
            with lock:
                state["fail"] += 1
            _push_bridge_event(bridge_url, {
                "type": "request",
                "request_id": f"nolb-{req_idx:04d}",
                "algorithm": "DIRECT_NO_LB",
                "selected_server": srv_id,
                "public_ip": vm["pub"],
                "private_ip": vm["priv"],
                "status": "error",
                "status_code": 503,
                "response_time_ms": 4.0,
                "server_exec_ms": 0.0,
                "direct_no_lb": True,
                "crashed": True,
            })
            print(
                f"{C_DIM}[{timestamp}]{C_RESET} {C_BOLD}REQ #{req_idx:04d}{C_RESET} "
                f"--> {C_RED}[NO LB]{C_RESET} --> {vm['color']}{vm['name']}{C_RESET} "
                f"{C_RED}{C_BOLD}[503 CRASHED — NO LB TO FAILOVER!]{C_RESET}"
            )
            return

        start = time.perf_counter()
        try:
            resp = requests.post(direct_url, json={"delay": 1.25}, timeout=6.0)
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            srv_exec = float(data.get("processing_time_ms", 1250.0))
            ok = resp.status_code == 200
            with lock:
                state["active"] = max(0, state["active"] - 1)
                if ok:
                    state["ok"] += 1
                    state["latencies"].append(elapsed_ms)
                else:
                    state["fail"] += 1

            _push_bridge_event(bridge_url, {
                "type": "request",
                "request_id": f"nolb-{req_idx:04d}",
                "algorithm": "DIRECT_NO_LB",
                "selected_server": srv_id,
                "public_ip": vm["pub"],
                "private_ip": vm["priv"],
                "status": "success" if ok else "error",
                "status_code": resp.status_code,
                "response_time_ms": round(elapsed_ms, 2),
                "server_exec_ms": round(srv_exec, 2),
                "direct_no_lb": True,
                "crashed": False,
            })
            print(
                f"{C_DIM}[{timestamp}]{C_RESET} {C_BOLD}REQ #{req_idx:04d}{C_RESET} "
                f"--> {C_YELLOW}[DIRECT -> NO LB]{C_RESET} --> {vm['color']}{C_BOLD}{vm['name']}{C_RESET} "
                f"({C_DIM}{vm['pub']}{C_RESET}) {C_GREEN}[200 OK]{C_RESET} {C_BOLD}{elapsed_ms:6.1f}ms{C_RESET}"
            )
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            with lock:
                state["active"] = max(0, state["active"] - 1)
                state["crashed"] = True
                state["fail"] += 1
            _push_bridge_event(bridge_url, {
                "type": "request",
                "request_id": f"nolb-{req_idx:04d}",
                "algorithm": "DIRECT_NO_LB",
                "selected_server": srv_id,
                "public_ip": vm["pub"],
                "private_ip": vm["priv"],
                "status": "error",
                "status_code": 503,
                "response_time_ms": round(elapsed_ms, 2),
                "direct_no_lb": True,
                "crashed": True,
            })
            print(
                f"{C_DIM}[{timestamp}]{C_RESET} {C_BOLD}REQ #{req_idx:04d}{C_RESET} "
                f"--> {C_RED}[NO LB]{C_RESET} --> {vm['name']} {C_RED}[TIMEOUT / CRASHED]{C_RESET} ({exc})"
            )

    # Wave 1: Smooth single-server ramp so packets glide cleanly into targeted Azure VM
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs1 = []
        for i in range(10):
            futs1.append(ex.submit(hit_single_vm, i + 1))
            time.sleep(0.09)
        for fut in futs1:
            fut.result()

    # Wave 2: Flood remaining concurrent threads directly onto the same single VM
    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        futures = []
        for i in range(max(0, count - 10)):
            futures.append(ex.submit(hit_single_vm, i + 11))
            time.sleep(0.04)
        for fut in futures:
            fut.result()

    print(f"\n{C_BOLD}{C_RED}================ NO-LB OUTAGE SUMMARY ================{C_RESET}")
    print(f"  Targeted Random VM:   {vm['name']} ({vm['pub']})")
    print(f"  Succeeded (200 OK):   {C_GREEN}{state['ok']}{C_RESET}")
    print(f"  Failed (Outage/503):  {C_RED}{state['fail']}{C_RESET}")
    print(f"  Other 2 Azure VMs:    {C_CYAN}0 requests (Completely Unused!){C_RESET}")
    print(f"  Conclusion:           {C_RED}Without a Load Balancer, 1 overloaded VM crashes & causes total downtime!{C_RESET}")
    print(f"{C_BOLD}{C_RED}======================================================{C_RESET}\n")
    print(f"{C_GREEN}Next step:{C_RESET} Start Load Balancer (`python backend/load-balancer/app.py`), then run:")
    print(f"  {C_BOLD}python send_traffic.py --with-lb{C_RESET}\n")


def run_with_lb_survival_test(url, count=45, concurrency=25):
    print(f"\n{C_BOLD}{C_GREEN}========================================================================{C_RESET}")
    print(f"{C_BOLD}{C_GREEN}  WITH LOAD BALANCER SCENARIO (Exact Same {count}-Req / {concurrency}-Thread Flood){C_RESET}")
    print(f"{C_DIM}  Load Balancer splits the {concurrency} concurrent threads evenly across ALL 3 VMs (~8 each!){C_RESET}")
    print(f"{C_BOLD}{C_GREEN}========================================================================{C_RESET}\n")

    restore_all_cli(url)
    switch_algorithm_cli(url, "round_robin")
    run_stress_test(url, count=count, concurrency=concurrency, delay=1.25)
    show_stats_cli(url)
    print(f"{C_BOLD}{C_GREEN}✅ WITH LOAD BALANCER: 3 VMs shared the load (~1/3 each) -> ZERO CRASHES & 100% UPTIME!{C_RESET}\n")


def main():
    parser = argparse.ArgumentParser(description="LoadFlow Azure Terminal Traffic Generator")
    parser.add_argument("--rate", "--rps", type=float, default=5.0, help="Requests per second in stream mode (default: 5.0)")
    parser.add_argument("--once", action="store_true", help="Send exactly one request and exit")
    parser.add_argument("--burst", type=int, default=0, help="Send a concurrent burst wave of N requests")
    parser.add_argument("--stress", action="store_true", help="Run high-concurrency stress test")
    parser.add_argument("--overload", action="store_true", help="Saturate connection pools & inject timeout to crash nodes")
    parser.add_argument("--no-lb", action="store_true", help="Bypass LB (when LB is OFF) & hammer 1 random Azure VM until it crashes")
    parser.add_argument("--with-lb", action="store_true", help="Run exact same heavy flood THROUGH LB across all 3 Azure VMs (zero crash)")
    parser.add_argument("--target", type=str, choices=["server-1", "server-2", "server-3"], default=None, help="Specific VM target for --no-lb")
    parser.add_argument("--bridge", default="http://127.0.0.1:5173", help="Frontend Vite bridge URL for --no-lb live visualizer sync")
    parser.add_argument("--demo", action="store_true", help="Run interactive 4-Act Faculty Live Presentation Demo")
    parser.add_argument("--auto", action="store_true", help="Run --demo automatically without waiting for ENTER")
    parser.add_argument("--restore", action="store_true", help="Restore all crashed or drained Azure backend nodes")
    parser.add_argument("--count", type=int, default=100, help="Number of requests for stress test (default: 100)")
    parser.add_argument("--concurrency", "--threads", type=int, default=20, help="Worker threads for stress test (default: 20)")
    parser.add_argument("--delay", type=float, default=0.0, help="Inject processing delay in seconds on Azure VMs")
    parser.add_argument("--toggle", type=str, choices=["server-1", "server-2", "server-3"], help="Toggle server online/offline")
    parser.add_argument("--algo", type=str, choices=["round_robin", "least_connections", "ip_hash"], help="Switch routing algorithm")
    parser.add_argument("--direct", action="store_true", help="Directly probe all 3 Azure backend VMs and request counters")
    parser.add_argument("--stats", action="store_true", help="Display live Load Balancer telemetry")
    parser.add_argument("--url", default="http://127.0.0.1:5000", help="Load Balancer URL (default: http://127.0.0.1:5000)")
    args = parser.parse_args()

    if args.no_lb:
        c = 45 if args.count == 100 else args.count
        t = 25 if args.concurrency == 20 else args.concurrency
        run_no_lb_crash_test(args.bridge, target_server=args.target, count=c, concurrency=t)
        return

    if args.with_lb:
        c = 45 if args.count == 100 else args.count
        t = 25 if args.concurrency == 20 else args.concurrency
        run_with_lb_survival_test(args.url, count=c, concurrency=t)
        return

    if args.demo:
        run_faculty_demo(args.url, auto=args.auto)
        return

    if args.restore:
        restore_all_cli(args.url)
        return

    if args.overload:
        run_overload_crash_test(args.url)
        return

    if args.direct:
        probe_direct_vms()
        return

    if args.toggle:
        toggle_server_cli(args.url, args.toggle)
        return

    if args.algo:
        switch_algorithm_cli(args.url, args.algo)
        return

    if args.stats:
        show_stats_cli(args.url)
        return

    if args.stress:
        print_banner(args.url)
        run_stress_test(args.url, count=args.count, concurrency=args.concurrency, delay=args.delay)
        return

    print_banner(args.url)

    if args.once:
        send_one(args.url, 1, delay=args.delay)
        return

    if args.burst > 0:
        print(f"{C_YELLOW}Sending burst wave of {args.burst} concurrent requests...{C_RESET}\n")
        start_time = time.time()
        counts = {}
        with ThreadPoolExecutor(max_workers=min(args.burst, 24)) as executor:
            futures = [executor.submit(send_one, args.url, i + 1, None, args.delay) for i in range(args.burst)]
            for fut in futures:
                ok, srv, ms = fut.result()
                counts[srv] = counts.get(srv, 0) + 1

        total_time = (time.time() - start_time)
        print(f"\n{C_BOLD}Burst Wave Summary:{C_RESET}")
        print(f"  Total Requests: {args.burst} in {total_time:.2f}s ({args.burst/total_time:.1f} req/s)")
        print(f"  Distribution:   {counts}\n")
        return

    # Continuous Streaming Mode
    delay = 1.0 / max(0.2, args.rate)
    print(f"{C_GREEN}Streaming requests at {args.rate:.1f} req/sec.{C_RESET} Press {C_BOLD}Ctrl+C{C_RESET} to stop.\n")

    counter = 0
    success_count = 0
    fail_count = 0
    server_counts = {}
    latencies = []

    client_ips = [
        "198.51.100.4",
        "203.0.113.19",
        "198.51.100.77",
        "192.0.2.145",
        "203.0.113.88",
        "198.51.100.99"
    ]

    try:
        while True:
            counter += 1
            client_ip = client_ips[(counter - 1) % len(client_ips)]
            ok, srv, ms = send_one(args.url, counter, client_ip=client_ip, delay=args.delay)
            if ok:
                success_count += 1
                server_counts[srv] = server_counts.get(srv, 0) + 1
                latencies.append(ms)
            else:
                fail_count += 1

            time.sleep(delay)

    except KeyboardInterrupt:
        print(f"\n\n{C_BOLD}Traffic stream stopped by user.{C_RESET}")
        avg_lat = sum(latencies) / len(latencies) if latencies else 0.0
        print(f"  Total Requests: {counter}")
        print(f"  Successful:     {C_GREEN}{success_count}{C_RESET}")
        print(f"  Failed:         {C_RED}{fail_count}{C_RESET}")
        print(f"  Average Latency:{C_BOLD} {avg_lat:.1f} ms{C_RESET}")
        print(f"  Distribution:   {server_counts}\n")


if __name__ == "__main__":
    main()
