class LeastConnectionsBalancer:
    def select_server(self, healthy_servers):
        if not healthy_servers:
            return None
        # Select server with minimum active_connections; Python's min() preserves list order on ties
        return min(healthy_servers, key=lambda s: s["active_connections"])
