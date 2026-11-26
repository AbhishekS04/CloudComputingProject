import time
import threading
import json
import queue
from datetime import datetime, timezone
import requests
from flask import Flask, jsonify, request, Response
try:
    from flask_cors import CORS
except ImportError:
    CORS = None

import config
from algorithms.round_robin import RoundRobinBalancer
from algorithms.least_connections import LeastConnectionsBalancer
from algorithms.random_balancer import RandomBalancer
from algorithms.weighted_round_robin import WeightedRoundRobinBalancer
from algorithms.ip_hash import IPHashBalancer
from services.request_tracker import RequestTracker
from services.health_check import HealthChecker


def create_app(start_health_checker=True):
    app = Flask(__name__)
    if CORS:
        CORS(app, expose_headers=["X-Backend-Server", "X-Response-Time", "X-Load-Balancer-Algo"])
    else:
        @app.after_request
        def add_cors_headers(response):
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Expose-Headers"] = "X-Backend-Server, X-Response-Time, X-Load-Balancer-Algo"
            return response

    tracker = RequestTracker(config.get_initial_servers())

    balancers = {
        "round_robin": RoundRobinBalancer(),
        "least_connections": LeastConnectionsBalancer(),
        "ip_hash": IPHashBalancer(),
    }
    state_lock = threading.Lock()
    current_algorithm = ["round_robin"]
    lb_paused = [False]

    # SSE Event Streaming Subscribers
    event_subscribers = []
    subscribers_lock = threading.Lock()

    def broadcast_event(data):
        with subscribers_lock:
            for q in list(event_subscribers):
                try:
                    q.put_nowait(data)
                except Exception:
                    pass

    health_checker = HealthChecker(
        tracker,
        interval=config.HEALTH_CHECK_INTERVAL,
        on_status_change=lambda srv: broadcast_event({
            "type": "server_update",
            "action": "health_change",
            "server": srv,
        }),
    )

    def get_algorithm():
        with state_lock:
            return current_algorithm[0]

    def set_algorithm(algo_name):
        normalized = algo_name.strip().lower().replace("-", "_").replace(" ", "_")
        if normalized not in balancers:
            return None
        with state_lock:
            current_algorithm[0] = normalized
            return current_algorithm[0]

    @app.route("/health", methods=["GET"])
    def health():
        stats = tracker.get_stats(get_algorithm())
        with state_lock:
            paused = lb_paused[0]
        return jsonify({
            "status": "paused" if paused else "healthy",
            "role": "load_balancer",
            "algorithm": stats["algorithm"],
            "healthy_servers": stats["healthy_servers"],
            "total_servers": stats["total_servers"],
            "gateway_public_ip": config.GATEWAY_PUBLIC_IP,
            "gateway_private_ip": config.GATEWAY_PRIVATE_IP,
            "vnet": config.GATEWAY_INFO["vnet"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 200

    @app.route("/api/stream", methods=["GET"])
    def sse_stream():
        """Server-Sent Events stream for real-time visualizer packet sync."""
        def event_generator():
            q = queue.Queue(maxsize=200)
            with subscribers_lock:
                event_subscribers.append(q)
            try:
                yield "data: {\"type\":\"connected\"}\n\n"
                while True:
                    try:
                        event = q.get(timeout=15.0)
                        yield f"data: {json.dumps(event)}\n\n"
                    except queue.Empty:
                        yield "data: {\"type\":\"ping\"}\n\n"
            finally:
                with subscribers_lock:
                    if q in event_subscribers:
                        event_subscribers.remove(q)

        return Response(
            event_generator(),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Access-Control-Allow-Origin": "*",
            }
        )

    @app.route("/api/algorithm", methods=["GET", "POST"])
    def algorithm():
        if request.method == "GET":
            return jsonify({
                "algorithm": get_algorithm(),
                "supported": list(balancers.keys()),
            }), 200

        payload = request.get_json(silent=True) or {}
        algo_name = payload.get("algorithm", "")
        updated = set_algorithm(algo_name)
        if not updated:
            return jsonify({
                "status": "error",
                "message": f"Unsupported algorithm '{algo_name}'. Supported: {list(balancers.keys())}",
            }), 400

        broadcast_event({"type": "algorithm", "algorithm": updated})
        return jsonify({
            "status": "success",
            "algorithm": updated,
        }), 200

    @app.route("/api/simulation/config", methods=["PUT", "POST"])
    def simulation_config():
        payload = request.get_json(silent=True) or {}
        if "algorithm" in payload:
            updated = set_algorithm(payload["algorithm"])
            if not updated:
                return jsonify({
                    "status": "error",
                    "message": f"Unsupported algorithm '{payload['algorithm']}'",
                }), 400
            broadcast_event({"type": "algorithm", "algorithm": updated})
        return jsonify({
            "success": True,
            "algorithm": get_algorithm(),
        }), 200

    @app.route("/api/servers", methods=["GET", "POST"])
    def servers():
        if request.method == "GET":
            return jsonify({
                "servers": tracker.get_all_servers(),
                "gateway": {
                    "public_ip": config.GATEWAY_PUBLIC_IP,
                    "private_ip": config.GATEWAY_PRIVATE_IP,
                    "vnet": config.GATEWAY_INFO["vnet"]
                }
            }), 200

        payload = request.get_json(silent=True) or {}
        server_id = payload.get("id")
        url = payload.get("url")
        if not server_id or not url:
            return jsonify({"status": "error", "message": "'id' and 'url' are required"}), 400
        created = tracker.add_server(
            server_id,
            url,
            name=payload.get("name"),
            public_ip=payload.get("public_ip"),
            private_ip=payload.get("private_ip")
        )
        broadcast_event({"type": "server_update", "action": "add", "server": created})
        return jsonify({"status": "success", "server": created}), 201

    @app.route("/api/servers/<server_id>", methods=["DELETE"])
    def delete_server(server_id):
        removed = tracker.remove_server(server_id)
        if not removed:
            return jsonify({"status": "error", "message": "Server not found"}), 404
        broadcast_event({"type": "server_update", "action": "delete", "server_id": server_id})
        return jsonify({"status": "success", "deleted": server_id}), 200

    @app.route("/api/servers/<server_id>/toggle", methods=["POST"])
    def toggle_server(server_id):
        updated = tracker.toggle_server(server_id)
        if not updated:
            return jsonify({"status": "error", "message": "Server not found"}), 404
        broadcast_event({"type": "server_update", "action": "toggle", "server": updated})
        return jsonify({"status": "success", "server": updated}), 200

    @app.route("/api/servers/recover", methods=["GET", "POST"])
    def recover_all_servers():
        recovered = []
        for srv in tracker.get_all_servers():
            srv_id = srv["id"]
            tracker.recover_server(srv_id)
            recovered.append(srv_id)
        broadcast_event({"type": "server_update", "action": "recover", "servers": tracker.get_all_servers()})
        return jsonify({"status": "success", "recovered": recovered, "message": "All Azure backend nodes restored"}), 200

    @app.route("/api/lb/toggle", methods=["POST"])
    def toggle_lb():
        payload = request.get_json(silent=True) or {}
        with state_lock:
            if "paused" in payload:
                lb_paused[0] = bool(payload["paused"])
            else:
                lb_paused[0] = not lb_paused[0]
            paused_now = lb_paused[0]
        if hasattr(health_checker, 'paused'):
            health_checker.paused = paused_now
        broadcast_event({"type": "lb_toggle", "paused": paused_now})
        return jsonify({"status": "success", "paused": paused_now}), 200

    @app.route("/api/stats", methods=["GET"])
    @app.route("/api/metrics", methods=["GET"])
    def stats():
        data = tracker.get_stats(get_algorithm())
        with state_lock:
            data["lb_paused"] = lb_paused[0]
        data["gateway"] = {
            "public_ip": config.GATEWAY_PUBLIC_IP,
            "private_ip": config.GATEWAY_PRIVATE_IP,
            "vnet": config.GATEWAY_INFO["vnet"]
        }
        return jsonify(data), 200

    @app.route("/api/logs", methods=["GET"])
    def logs():
        limit = request.args.get("limit", default=100, type=int)
        limit = max(1, min(limit, 500))
        return jsonify({
            "logs": tracker.get_logs(limit=limit),
        }), 200

    @app.route("/api/request", methods=["GET", "POST"])
    @app.route("/api/process", methods=["GET", "POST"])
    @app.route("/request", methods=["GET", "POST"])
    @app.route("/", methods=["GET", "POST"])
    def route_request():
        with state_lock:
            if lb_paused[0]:
                return jsonify({
                    "status": "error",
                    "message": "Load Balancer is paused/offline",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }), 503

        req_arrival = time.time()
        algo = get_algorithm()
        healthy_servers = tracker.get_healthy_servers()
        payload = request.get_json(silent=True) or {}
        client_ip = payload.get("clientIp") or payload.get("client_ip") or request.headers.get("X-Forwarded-For") or request.remote_addr or "198.51.100.4"

        if not healthy_servers:
            err_id = f"err-{int(time.time() * 1000)}"
            broadcast_event({
                "type": "request",
                "request_id": err_id,
                "algorithm": algo,
                "selected_server": None,
                "server_url": None,
                "public_ip": config.GATEWAY_PUBLIC_IP,
                "private_ip": config.GATEWAY_PRIVATE_IP,
                "client_ip": client_ip,
                "status": "error",
                "status_code": 503,
                "response_time_ms": 2.0,
                "message": "All backend servers offline (503 Service Unavailable)",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            return jsonify({
                "status": "error",
                "algorithm": algo,
                "message": "No healthy backend servers available",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }), 503

        if "delay" not in payload and "delay" in request.args:
            payload["delay"] = request.args.get("delay")

        tried_ids = set()
        failover_from = None
        last_error = None
        last_server_id = None
        last_elapsed_ms = 0.0

        while True:
            candidates = [s for s in tracker.get_healthy_servers() if s["id"] not in tried_ids]
            if not candidates:
                break

            try:
                selected = balancers[algo].select_server(candidates, client_ip=client_ip)
            except TypeError:
                selected = balancers[algo].select_server(candidates)

            server_id = selected["id"]
            tried_ids.add(server_id)
            last_server_id = server_id
            target_url = f"{selected['url']}/api/process"

            # Circuit Breaker: Detect overload saturation if other healthy nodes can absorb failover
            if selected.get("active_connections", 0) >= config.OVERLOAD_MAX_CONNS and len(candidates) > 1:
                crashed_srv = tracker.mark_crashed(
                    server_id,
                    cooldown_seconds=config.OVERLOAD_COOLDOWN_SEC,
                    reason=f"Overload Saturation ({selected.get('active_connections')} active conns)",
                )
                req_id = tracker.start_connection(server_id)
                tracker.end_connection(
                    server_id=server_id,
                    req_id=req_id,
                    algorithm=algo,
                    success=False,
                    response_time_ms=12.0,
                    status_code=503,
                    error="Circuit Breaker: Overload Crash",
                )
                srv_info = crashed_srv or tracker.get_server(server_id) or {}
                broadcast_event({
                    "type": "request",
                    "request_id": req_id,
                    "algorithm": algo,
                    "selected_server": server_id,
                    "server_url": selected["url"],
                    "public_ip": srv_info.get("public_ip") or selected["url"].replace("http://", "").replace("https://", "").rstrip("/"),
                    "private_ip": srv_info.get("private_ip") or "10.0.1.10",
                    "client_ip": client_ip,
                    "status": "error",
                    "status_code": 503,
                    "response_time_ms": 12.0,
                    "error": "Circuit Breaker: Overload Crash",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                broadcast_event({"type": "server_update", "action": "crash", "server": srv_info})
                failover_from = failover_from or server_id
                last_error = f"Overload saturation on {server_id}"
                continue

            req_id = tracker.start_connection(server_id)
            start_time = time.time()
            lb_dispatch_ms = max(0.2, round((start_time - req_arrival) * 1000.0, 2))

            try:
                resp = requests.post(target_url, json=payload, timeout=config.REQUEST_TIMEOUT)
                elapsed_ms = (time.time() - start_time) * 1000.0
                backend_data = resp.json()
                server_exec_ms = round(float(backend_data.get("processing_time_ms", 1.5)), 2)

                success = resp.status_code == 200
                tracker.end_connection(
                    server_id=server_id,
                    req_id=req_id,
                    algorithm=algo,
                    success=success,
                    response_time_ms=elapsed_ms,
                    status_code=resp.status_code,
                )

                srv_info = tracker.get_server(server_id) or {}
                event_payload = {
                    "type": "request",
                    "request_id": req_id,
                    "algorithm": algo,
                    "selected_server": server_id,
                    "server_url": selected["url"],
                    "public_ip": srv_info.get("public_ip") or selected["url"].replace("http://", "").replace("https://", "").rstrip("/"),
                    "private_ip": srv_info.get("private_ip") or "10.0.1.10",
                    "client_ip": client_ip,
                    "status": "success" if success else "error",
                    "status_code": resp.status_code,
                    "response_time_ms": round(elapsed_ms, 2),
                    "server_exec_ms": server_exec_ms,
                    "lb_dispatch_ms": lb_dispatch_ms,
                    "failover_from": failover_from,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                broadcast_event(event_payload)

                body = {
                    "request_id": req_id,
                    "algorithm": algo,
                    "selected_server": server_id,
                    "public_ip": event_payload["public_ip"],
                    "private_ip": event_payload["private_ip"],
                    "status": "success" if success else "error",
                    "response_time_ms": round(elapsed_ms, 2),
                    "server_exec_ms": server_exec_ms,
                    "lb_dispatch_ms": lb_dispatch_ms,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "response": backend_data,
                }
                if failover_from:
                    body["failover_from"] = failover_from
                return jsonify(body), resp.status_code

            except Exception as exc:
                elapsed_ms = (time.time() - start_time) * 1000.0
                last_elapsed_ms = elapsed_ms
                last_error = str(exc)

                is_timeout = isinstance(exc, requests.exceptions.Timeout)
                crashed_srv = tracker.mark_crashed(
                    server_id,
                    cooldown_seconds=config.OVERLOAD_COOLDOWN_SEC if is_timeout else 0.0,
                    reason="Request Timeout (>4s)" if is_timeout else "VM Unreachable / Connection Refused",
                )
                tracker.end_connection(
                    server_id=server_id,
                    req_id=req_id,
                    algorithm=algo,
                    success=False,
                    response_time_ms=elapsed_ms,
                    status_code=502,
                    error=str(exc),
                )

                srv_info = crashed_srv or tracker.get_server(server_id) or {}
                event_payload = {
                    "type": "request",
                    "request_id": req_id,
                    "algorithm": algo,
                    "selected_server": server_id,
                    "server_url": selected["url"],
                    "public_ip": srv_info.get("public_ip") or selected["url"].replace("http://", "").replace("https://", "").rstrip("/"),
                    "private_ip": srv_info.get("private_ip") or "10.0.1.10",
                    "client_ip": client_ip,
                    "status": "error",
                    "status_code": 502,
                    "response_time_ms": round(elapsed_ms, 2),
                    "error": str(exc),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                broadcast_event(event_payload)
                broadcast_event({"type": "server_update", "action": "crash", "server": srv_info})
                failover_from = failover_from or server_id

        return jsonify({
            "request_id": f"err-{int(time.time() * 1000)}",
            "algorithm": algo,
            "selected_server": last_server_id,
            "status": "error",
            "response_time_ms": round(last_elapsed_ms, 2),
            "message": "All attempted backend servers failed to respond",
            "error": last_error or "No healthy backend servers available",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 502

    app.tracker = tracker
    app.health_checker = health_checker

    if start_health_checker:
        health_checker.check_all_now()
        health_checker.start()

    @app.route("/gateway-health", methods=["GET"])
    def gateway_health():
        with state_lock:
            paused_now = lb_paused[0]
        return jsonify({
            "status": "paused" if paused_now else "healthy",
            "gateway": "azure-vm-lb-01",
            "gateway_public_ip": config.GATEWAY_PUBLIC_IP,
            "gateway_private_ip": config.GATEWAY_PRIVATE_IP,
            "vnet": config.GATEWAY_INFO["vnet"],
            "algorithm": get_algorithm(),
            "paused": paused_now,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200

    @app.route("/cluster-status", methods=["GET"])
    def cluster_status():
        return jsonify({
            "servers": tracker.get_all_servers(),
            "stats": tracker.get_stats(get_algorithm())
        }), 200

    @app.route("/api/data", methods=["GET", "POST"])
    def api_data_alias():
        return route_request()

    return app


if __name__ == "__main__":
    application = create_app(start_health_checker=True)
    application.run(host=config.HOST, port=config.PORT, threaded=True)
