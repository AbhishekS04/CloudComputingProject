import os

HOST = os.getenv("LB_HOST", "0.0.0.0")
PORT = int(os.getenv("LB_PORT", "5000"))

# Default live Azure backend servers
DEFAULT_SERVERS = "server-1=http://52.172.229.225:5001,server-2=http://20.193.245.71:5001,server-3=http://52.172.255.132:5001"

SERVER_METADATA = {
    "server-1": {
        "name": "Server A",
        "public_ip": "52.172.229.225:5001",
        "private_ip": "10.0.1.10",
    },
    "server-2": {
        "name": "Server B",
        "public_ip": "20.193.245.71:5001",
        "private_ip": "10.0.1.11",
    },
    "server-3": {
        "name": "Server C",
        "public_ip": "52.172.255.132:5001",
        "private_ip": "10.0.1.12",
    },
}

GATEWAY_PUBLIC_IP = os.getenv("GATEWAY_PUBLIC_IP", "20.244.34.101:5000")
GATEWAY_PRIVATE_IP = os.getenv("GATEWAY_PRIVATE_IP", "172.16.0.4")

GATEWAY_INFO = {
    "name": "Azure LB-VM Gateway",
    "public_ip": GATEWAY_PUBLIC_IP,
    "private_ip": GATEWAY_PRIVATE_IP,
    "vnet": "vnet-centralindia-2"
}


def get_initial_servers():
    raw = os.getenv("BACKEND_SERVERS", DEFAULT_SERVERS)
    servers = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry or "=" not in entry:
            continue
        server_id, url = entry.split("=", 1)
        srv_id = server_id.strip()
        clean_url = url.strip().rstrip("/")
        meta = SERVER_METADATA.get(srv_id, {})
        servers.append({
            "id": srv_id,
            "name": meta.get("name", srv_id),
            "url": clean_url,
            "public_ip": meta.get("public_ip", clean_url.replace("http://", "").replace("https://", "")),
            "private_ip": meta.get("private_ip", f"10.0.1.{10 + len(servers)}"),
        })
    return servers


HEALTH_CHECK_INTERVAL = float(os.getenv("HEALTH_CHECK_INTERVAL", "2.5"))
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "4.0"))
OVERLOAD_MAX_CONNS = int(os.getenv("OVERLOAD_MAX_CONNS", "12"))
OVERLOAD_COOLDOWN_SEC = float(os.getenv("OVERLOAD_COOLDOWN_SEC", "20.0"))
