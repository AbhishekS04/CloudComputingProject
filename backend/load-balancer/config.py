import os

HOST = os.getenv("LB_HOST", "0.0.0.0")
PORT = int(os.getenv("LB_PORT", "5000"))

# Default local backend servers (overridable via BACKEND_SERVERS env var for Azure)
# Format: "server-1=http://127.0.0.1:5001,server-2=http://127.0.0.1:5002,server-3=http://127.0.0.1:5003"
DEFAULT_SERVERS = "server-1=http://52.172.229.225:5001,server-2=http://20.193.245.71:5001,server-3=http://52.172.255.132:5001"


def get_initial_servers():
    raw = os.getenv("BACKEND_SERVERS", DEFAULT_SERVERS)
    servers = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry or "=" not in entry:
            continue
        server_id, url = entry.split("=", 1)
        servers.append({
            "id": server_id.strip(),
            "url": url.strip().rstrip("/"),
        })
    return servers


HEALTH_CHECK_INTERVAL = float(os.getenv("HEALTH_CHECK_INTERVAL", "5.0"))
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "15.0"))

