import time
import threading
from datetime import datetime, timezone
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

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
    CORS(app)

    tracker = RequestTracker(config.get_initial_servers())
    health_checker = HealthChecker(tracker, interval=config.HEALTH_CHECK_INTERVAL)

    balancers = {
        "round_robin": RoundRobinBalancer(),
        "least_connections": LeastConnectionsBalancer(),
    }
    state_lock = threading.Lock()
    current_algorithm = ["round_robin"]
    lb_paused = [False]

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
        return jsonify({
            "status": "healthy",
            "role": "load_balancer",
            "algorithm": stats["algorithm"],
            "healthy_servers": stats["healthy_servers"],
            "total_servers": stats["total_servers"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 200

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
        return jsonify({
            "success": True,
            "algorithm": get_algorithm(),
        }), 200

    @app.route("/api/servers", methods=["GET", "POST"])
    def servers():
        if request.method == "GET":
            return jsonify({
                "servers": tracker.get_all_servers(),
            }), 200

        payload = request.get_json(silent=True) or {}
        server_id = payload.get("id")
        url = payload.get("url")
        if not server_id or not url:
            return jsonify({"status": "error", "message": "'id' and 'url' are required"}), 400
        created = tracker.add_server(server_id, url, name=payload.get("name"))
        return jsonify({"status": "success", "server": created}), 201

    @app.route("/api/servers/<server_id>", methods=["DELETE"])
    def delete_server(server_id):
        removed = tracker.remove_server(server_id)
        if not removed:
            return jsonify({"status": "error", "message": "Server not found"}), 404
        return jsonify({"status": "success", "deleted": server_id}), 200

    @app.route("/api/servers/<server_id>/toggle", methods=["POST"])
    def toggle_server(server_id):
        updated = tracker.toggle_server(server_id)
        if not updated:
            return jsonify({"status": "error", "message": "Server not found"}), 404
        return jsonify({"status": "success", "server": updated}), 200

    @app.route("/api/lb/toggle", methods=["POST"])
    def toggle_lb():
        payload = request.get_json(silent=True) or {}
        with state_lock:
            if "paused" in payload:
                lb_paused[0] = bool(payload["paused"])
            else:
                lb_paused[0] = not lb_paused[0]
            paused_now = lb_paused[0]
        return jsonify({"status": "success", "paused": paused_now}), 200

    @app.route("/api/stats", methods=["GET"])
    @app.route("/api/metrics", methods=["GET"])
    def stats():
        data = tracker.get_stats(get_algorithm())
        with state_lock:
            data["lb_paused"] = lb_paused[0]
        return jsonify(data), 200

    @app.route("/api/logs", methods=["GET"])
    def logs():
        limit = request.args.get("limit", default=100, type=int)
        limit = max(1, min(limit, 500))
        return jsonify({
            "logs": tracker.get_logs(limit=limit),
        }), 200

    @app.route("/api/request", methods=["GET", "POST"])
    def route_request():
        algo = get_algorithm()
        healthy_servers = tracker.get_healthy_servers()

        if not healthy_servers:
            return jsonify({
                "status": "error",
                "algorithm": algo,
                "message": "No healthy backend servers available",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }), 503

        payload = request.get_json(silent=True) or {}
        client_ip = payload.get("clientIp") or payload.get("client_ip") or request.headers.get("X-Forwarded-For") or request.remote_addr
        try:
            selected = balancers[algo].select_server(healthy_servers, client_ip=client_ip)
        except TypeError:
            selected = balancers[algo].select_server(healthy_servers)
        server_id = selected["id"]
        target_url = f"{selected['url']}/api/process"

        payload = request.get_json(silent=True) or {}
        if "delay" not in payload and "delay" in request.args:
            payload["delay"] = request.args.get("delay")

        req_id = tracker.start_connection(server_id)
        start_time = time.time()

        try:
            resp = requests.post(target_url, json=payload, timeout=config.REQUEST_TIMEOUT)
            elapsed_ms = (time.time() - start_time) * 1000.0
            backend_data = resp.json()

            success = resp.status_code == 200
            tracker.end_connection(
                server_id=server_id,
                req_id=req_id,
                algorithm=algo,
                success=success,
                response_time_ms=elapsed_ms,
                status_code=resp.status_code,
            )

            return jsonify({
                "request_id": req_id,
                "algorithm": algo,
                "selected_server": server_id,
                "status": "success" if success else "error",
                "response_time_ms": round(elapsed_ms, 2),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "response": backend_data,
            }), resp.status_code

        except Exception as exc:
            elapsed_ms = (time.time() - start_time) * 1000.0
            tracker.update_health(server_id, False)
            tracker.end_connection(
                server_id=server_id,
                req_id=req_id,
                algorithm=algo,
                success=False,
                response_time_ms=elapsed_ms,
                status_code=502,
                error=str(exc),
            )
            return jsonify({
                "request_id": req_id,
                "algorithm": algo,
                "selected_server": server_id,
                "status": "error",
                "response_time_ms": round(elapsed_ms, 2),
                "message": f"Backend server '{server_id}' failed to respond",
                "error": str(exc),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }), 502

    app.tracker = tracker
    app.health_checker = health_checker

    if start_health_checker:
        health_checker.check_all_now()
        health_checker.start()

    return app


if __name__ == "__main__":
    application = create_app(start_health_checker=True)
    application.run(host=config.HOST, port=config.PORT, threaded=True)


