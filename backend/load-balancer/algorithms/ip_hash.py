import hashlib


class IPHashBalancer:
    def select_server(self, healthy_servers, client_ip=None):
        if not healthy_servers:
            return None
        key = str(client_ip or "127.0.0.1").encode("utf-8")
        digest = int(hashlib.md5(key).hexdigest(), 16)
        return healthy_servers[digest % len(healthy_servers)]
