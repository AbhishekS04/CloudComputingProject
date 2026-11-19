import threading


class RoundRobinBalancer:
    def __init__(self):
        self._index = 0
        self._lock = threading.Lock()

    def select_server(self, healthy_servers):
        if not healthy_servers:
            return None
        with self._lock:
            server = healthy_servers[self._index % len(healthy_servers)]
            self._index = (self._index + 1) % len(healthy_servers)
            return server

    def reset(self):
        with self._lock:
            self._index = 0
