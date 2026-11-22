import random


class RandomBalancer:
    def select_server(self, healthy_servers, client_ip=None):
        if not healthy_servers:
            return None
        return random.choice(healthy_servers)
