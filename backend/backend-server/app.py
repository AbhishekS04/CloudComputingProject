import time
import threading
from datetime import datetime, timezone
from flask import Flask, jsonify, request
import config

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

START_TIME = time.time()
request_count = 0
count_lock = threading.Lock()


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "server_id": config.SERVER_ID,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


@app.route("/api/info", methods=["GET"])
def info():
    with count_lock:
        total = request_count

    return jsonify({
        "server_id": config.SERVER_ID,
        "host": config.HOST,
        "port": config.PORT,
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "requests_handled": total
    }), 200


@app.route("/api/process", methods=["GET", "POST"])
@app.route("/api/request", methods=["GET", "POST"])
@app.route("/request", methods=["GET", "POST"])
@app.route("/", methods=["GET", "POST"])
def process_request():
    global request_count
    start = time.time()

    payload = request.get_json(silent=True) or {}
    delay = payload.get("delay", request.args.get("delay", 0))

    try:
        delay = max(0.0, min(float(delay), 10.0))
    except (ValueError, TypeError):
        delay = 0.0

    if delay > 0:
        time.sleep(delay)

    with count_lock:
        request_count += 1
        current_count = request_count

    processing_time_ms = round((time.time() - start) * 1000, 2)

    return jsonify({
        "server_id": config.SERVER_ID,
        "status": "success",
        "message": f"Request processed successfully by {config.SERVER_ID}",
        "request_number": current_count,
        "processing_time_ms": processing_time_ms,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


if __name__ == "__main__":
    app.run(host=config.HOST, port=config.PORT, threaded=True)
