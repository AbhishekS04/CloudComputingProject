import threading
from collections import deque
from datetime import datetime, timezone


class RequestTracker:
    def __init__(self, initial_servers, max_logs=500):
        self._lock = threading.Lock()
        self._servers = {}
        for srv in initial_servers:
            srv_id = srv["id"]
            url = srv["url"]
            # Extract public host:port from url
            public_ip = srv.get("public_ip") or url.replace("http://", "").replace("https://", "").rstrip("/")
            private_ip = srv.get("private_ip") or {
                "server-1": "10.0.1.10",
                "server-2": "10.0.1.11",
                "server-3": "10.0.1.12",
            }.get(srv_id, f"10.0.1.{10 + len(self._servers)}")

            self._servers[srv_id] = {
                "id": srv_id,
                "name": srv.get("name", srv_id),
                "url": url,
                "public_ip": public_ip,
                "private_ip": private_ip,
                "status": "healthy",
                "enabled": True,
                "active_connections": 0,
                "total_requests": 0,
                "failed_requests": 0,
                "total_response_time_ms": 0.0,
                "avg_response_time_ms": 0.0,
                "last_checked": None,
            }
        self._logs = deque(maxlen=max_logs)
        self._request_counter = 0
        self._total_requests = 0
        self._successful_requests = 0
        self._failed_requests = 0
        self._total_latency_ms = 0.0

    def get_all_servers(self):
        with self._lock:
            return [self._serialize_server(s) for s in self._servers.values()]

    def get_healthy_servers(self):
        with self._lock:
            return [
                self._serialize_server(s)
                for s in self._servers.values()
                if s["enabled"] and s["status"] == "healthy"
            ]

    def get_server(self, server_id):
        with self._lock:
            srv = self._servers.get(server_id)
            return self._serialize_server(srv) if srv else None

    def add_server(self, server_id, url, name=None, public_ip=None, private_ip=None):
        with self._lock:
            pub = public_ip or url.replace("http://", "").replace("https://", "").rstrip("/")
            priv = private_ip or f"10.0.1.{10 + len(self._servers)}"
            self._servers[server_id] = {
                "id": server_id,
                "name": name or server_id,
                "url": url.rstrip("/"),
                "public_ip": pub,
                "private_ip": priv,
                "status": "healthy",
                "enabled": True,
                "active_connections": 0,
                "total_requests": 0,
                "failed_requests": 0,
                "total_response_time_ms": 0.0,
                "avg_response_time_ms": 0.0,
                "last_checked": None,
            }
            return self._serialize_server(self._servers[server_id])

    def remove_server(self, server_id):
        with self._lock:
            return self._servers.pop(server_id, None) is not None

    def toggle_server(self, server_id):
        with self._lock:
            srv = self._servers.get(server_id)
            if not srv:
                return None
            srv["enabled"] = not srv["enabled"]
            if not srv["enabled"]:
                srv["status"] = "offline"
            else:
                srv["status"] = "healthy"
            return self._serialize_server(srv)

    def update_health(self, server_id, is_healthy):
        with self._lock:
            srv = self._servers.get(server_id)
            if not srv:
                return
            srv["last_checked"] = datetime.now(timezone.utc).isoformat()
            if not srv["enabled"]:
                srv["status"] = "offline"
            else:
                srv["status"] = "healthy" if is_healthy else "unhealthy"

    def start_connection(self, server_id):
        with self._lock:
            self._request_counter += 1
            req_id = f"req-{self._request_counter:04d}"
            srv = self._servers.get(server_id)
            if srv:
                srv["active_connections"] += 1
            return req_id

    def end_connection(self, server_id, req_id, algorithm, success, response_time_ms, status_code=200, error=None):
        with self._lock:
            srv = self._servers.get(server_id)
            if srv:
                srv["active_connections"] = max(0, srv["active_connections"] - 1)
                srv["total_requests"] += 1
                if success:
                    srv["total_response_time_ms"] += response_time_ms
                    completed = srv["total_requests"] - srv["failed_requests"]
                    if completed > 0:
                        srv["avg_response_time_ms"] = round(srv["total_response_time_ms"] / completed, 2)
                else:
                    srv["failed_requests"] += 1

            self._total_requests += 1
            if success:
                self._successful_requests += 1
                self._total_latency_ms += response_time_ms
            else:
                self._failed_requests += 1

            log_entry = {
                "id": req_id,
                "request_id": req_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "algorithm": algorithm,
                "server_id": server_id,
                "selected_server": server_id,
                "status": "success" if success else "error",
                "status_code": status_code,
                "response_time_ms": round(response_time_ms, 2),
                "error": error,
            }
            self._logs.appendleft(log_entry)
            return log_entry

    def get_logs(self, limit=100):
        with self._lock:
            return list(self._logs)[:limit]

    def get_stats(self, current_algorithm):
        with self._lock:
            servers_list = list(self._servers.values())
            healthy_count = sum(1 for s in servers_list if s["enabled"] and s["status"] == "healthy")
            active_conns = sum(s["active_connections"] for s in servers_list)
            avg_latency = (
                round(self._total_latency_ms / self._successful_requests, 2)
                if self._successful_requests > 0
                else 0.0
            )
            return {
                "algorithm": current_algorithm,
                "total_requests": self._total_requests,
                "successful_requests": self._successful_requests,
                "failed_requests": self._failed_requests,
                "active_connections": active_conns,
                "avg_response_time_ms": avg_latency,
                "healthy_servers": healthy_count,
                "total_servers": len(servers_list),
                "servers": [self._serialize_server(s) for s in servers_list],
            }

    @staticmethod
    def _serialize_server(srv):
        return {
            "id": srv["id"],
            "name": srv["name"],
            "url": srv["url"],
            "public_ip": srv.get("public_ip") or srv["url"].replace("http://", "").replace("https://", "").rstrip("/"),
            "private_ip": srv.get("private_ip") or "10.0.1.10",
            "status": srv["status"],
            "enabled": srv["enabled"],
            "active_connections": srv["active_connections"],
            "total_requests": srv["total_requests"],
            "failed_requests": srv["failed_requests"],
            "avg_response_time_ms": srv["avg_response_time_ms"],
            "last_checked": srv["last_checked"],
        }
