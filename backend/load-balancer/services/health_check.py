import threading
import time
import requests


class HealthChecker:
    def __init__(self, tracker, interval=5.0, timeout=2.0, on_status_change=None):
        self.tracker = tracker
        self.interval = interval
        self.timeout = timeout
        self.on_status_change = on_status_change
        self._stop_event = threading.Event()
        self._thread = None

    def check_all_now(self):
        for srv in self.tracker.get_all_servers():
            if not srv["enabled"]:
                changed, updated = self.tracker.update_health(srv["id"], False)
                if changed and self.on_status_change and updated:
                    self.on_status_change(updated)
                continue
            try:
                res = requests.get(f"{srv['url']}/health", timeout=self.timeout)
                changed, updated = self.tracker.update_health(srv["id"], res.status_code == 200)
            except requests.RequestException:
                changed, updated = self.tracker.update_health(srv["id"], False)

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
