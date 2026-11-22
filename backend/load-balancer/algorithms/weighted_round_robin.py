import threading


class WeightedRoundRobinBalancer:
    def __init__(self):
        self._lock = threading.Lock()
        self._index = 0

    def select_server(self, healthy_servers, client_ip=None):
        if not healthy_servers:
            return None

        weighted_pool = []
        for srv in healthy_servers:
            weight = max(1, int(srv.get("weight", 1)))
            weighted_pool.extend([srv] * weight)

        with self._lock:
            selected = weighted_pool[self._index % len(weighted_pool)]
            self._index = (self._index + 1) % len(weighted_pool)
            return selected
