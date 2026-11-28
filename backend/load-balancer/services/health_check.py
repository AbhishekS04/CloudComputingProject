from concurrent.futures import ThreadPoolExecutor
import json
import os
import subprocess
import threading
import requests

_DEFAULT_RUST_BIN = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "health-probe", "target", "release", "bifrost-probe")
)


class HealthChecker:
    def __init__(self, tracker, interval=5.0, timeout=2.0, on_status_change=None):
        self.tracker = tracker
        self.interval = interval
        self.timeout = timeout
        self.on_status_change = on_status_change
        self.paused = False
        self._stop_event = threading.Event()
        self._thread = None

    def _probe_via_rust(self, enabled_servers):
        """Use compiled Rust bifrost-probe binary when available and requests.get is unmocked."""
        if os.getenv("BIFROST_USE_RUST_PROBE", "1") == "0":
            return None
        if getattr(requests.get, "__module__", "") != "requests.api":
            return None

        probe_bin = os.getenv("BIFROST_PROBE_BIN", _DEFAULT_RUST_BIN)
        if not os.path.isfile(probe_bin) or not os.access(probe_bin, os.X_OK):
            return None

        targets = ",".join(f"{srv['id']}={srv['url'].rstrip('/')}/health" for srv in enabled_servers)
        if not targets:
            return {}

        timeout_ms = max(250, int(self.timeout * 1000))
        try:
            proc = subprocess.run(
                [probe_bin, "--once", "--timeout-ms", str(timeout_ms), "--targets", targets],
                capture_output=True,
                text=True,
                timeout=max(2.0, self.timeout + 1.5),
                check=False,
            )
            if proc.returncode != 0 or not proc.stdout.strip():
                return None
            payload = json.loads(proc.stdout)
            return {item["id"]: bool(item.get("healthy")) for item in payload.get("servers", [])}
        except Exception:
            return None

    def _probe_python(self, srv):
        try:
            res = requests.get(f"{srv['url'].rstrip('/')}/health", timeout=self.timeout)
            return res.status_code == 200
        except requests.RequestException:
            return False

    def check_all_now(self):
        all_servers = self.tracker.get_all_servers()
        enabled_servers = []

        for srv in all_servers:
            if not srv["enabled"]:
                changed, updated = self.tracker.update_health(srv["id"], False)
                if changed and self.on_status_change and updated:
                    self.on_status_change(updated)
            else:
                enabled_servers.append(srv)

        if not enabled_servers:
            return

        rust_results = self._probe_via_rust(enabled_servers)
        if rust_results is not None and all(srv["id"] in rust_results for srv in enabled_servers):
            health_map = rust_results
        else:
            with ThreadPoolExecutor(max_workers=min(8, len(enabled_servers))) as pool:
                futures = {srv["id"]: pool.submit(self._probe_python, srv) for srv in enabled_servers}
                health_map = {srv_id: fut.result() for srv_id, fut in futures.items()}

        for srv in enabled_servers:
            changed, updated = self.tracker.update_health(srv["id"], health_map.get(srv["id"], False))
            if changed and self.on_status_change and updated:
                self.on_status_change(updated)

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()

    def _run(self):
        while not self._stop_event.is_set():
            self.check_all_now()
            self._stop_event.wait(self.interval)
