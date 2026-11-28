import threading


class LeastConnectionsBalancer:
    def __init__(self):
        self._tie_cursor = 0
        self._lock = threading.Lock()

    def select_server(self, healthy_servers):
        if not healthy_servers:
            return None
        min_conns = min(s["active_connections"] for s in healthy_servers)
        tied = [s for s in healthy_servers if s["active_connections"] == min_conns]
        if len(tied) == 1:
            return tied[0]
        with self._lock:
            pick = tied[self._tie_cursor % len(tied)]
            self._tie_cursor = (self._tie_cursor + 1) % len(tied)
            return pick
