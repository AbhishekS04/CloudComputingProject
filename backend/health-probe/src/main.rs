use std::env;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream, ToSocketAddrs};
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const DEFAULT_TARGETS: &str = concat!(
    "lb=http://20.244.34.101:5000/gateway-health,",
    "server-1=http://52.172.229.225:5001/health,",
    "server-2=http://20.193.245.71:5001/health,",
    "server-3=http://52.172.255.132:5001/health"
);

#[derive(Clone, Debug, PartialEq, Eq)]
struct ProbeTarget {
    id: String,
    host: String,
    port: u16,
    path: String,
    is_lb: bool,
}

#[derive(Clone, Debug)]
struct ProbeResult {
    id: String,
    is_lb: bool,
    healthy: bool,
    paused: bool,
    status: &'static str,
    status_code: Option<u16>,
    latency_ms: f64,
    error: Option<String>,
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn escape_json(input: &str) -> String {
    let mut out = String::with_capacity(input.len() + 4);
    for ch in input.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if c.is_control() => out.push(' '),
            c => out.push(c),
        }
    }
    out
}

fn parse_target(spec: &str) -> Option<ProbeTarget> {
    let (id_raw, url_raw) = spec.split_once('=')?;
    let id = id_raw.trim();
    let trimmed = url_raw.trim();
    if id.is_empty() || trimmed.is_empty() {
        return None;
    }

    let without_scheme = trimmed
        .strip_prefix("http://")
        .or_else(|| trimmed.strip_prefix("https://"))
        .unwrap_or(trimmed);

    let (authority, path) = match without_scheme.find('/') {
        Some(idx) => (&without_scheme[..idx], &without_scheme[idx..]),
        None => (without_scheme, if id == "lb" { "/gateway-health" } else { "/health" }),
    };

    let (host, port) = match authority.rsplit_once(':') {
        Some((h, p)) => (h.trim(), p.trim().parse::<u16>().ok()?),
        None => (authority.trim(), 80),
    };

    if host.is_empty() {
        return None;
    }

    Some(ProbeTarget {
        id: id.to_string(),
        host: host.to_string(),
        port,
        path: if path.is_empty() { "/".to_string() } else { path.to_string() },
        is_lb: id == "lb",
    })
}

fn parse_targets_list(raw: &str) -> Vec<ProbeTarget> {
    raw.split(',')
        .filter_map(|part| parse_target(part.trim()))
        .collect()
}

fn parse_http_status_code(raw: &str) -> Option<u16> {
    let first_line = raw.lines().next()?;
    let mut parts = first_line.split_whitespace();
    let _http_ver = parts.next()?;
    let code_str = parts.next()?;
    code_str.parse::<u16>().ok()
}

fn probe_single(target: &ProbeTarget, timeout: Duration) -> ProbeResult {
    let start = Instant::now();
    let addr_str = format!("{}:{}", target.host, target.port);

    let addrs: Vec<SocketAddr> = match addr_str.to_socket_addrs() {
        Ok(iter) => iter.collect(),
        Err(e) => {
            return ProbeResult {
                id: target.id.clone(),
                is_lb: target.is_lb,
                healthy: false,
                paused: false,
                status: "offline",
                status_code: None,
                latency_ms: start.elapsed().as_secs_f64() * 1000.0,
                error: Some(format!("resolve error: {e}")),
            };
        }
    };

    let Some(sock_addr) = addrs.first() else {
        return ProbeResult {
            id: target.id.clone(),
            is_lb: target.is_lb,
            healthy: false,
            paused: false,
            status: "offline",
            status_code: None,
            latency_ms: start.elapsed().as_secs_f64() * 1000.0,
            error: Some("no resolved address".to_string()),
        };
    };

    let mut stream = match TcpStream::connect_timeout(sock_addr, timeout) {
        Ok(s) => s,
        Err(e) => {
            return ProbeResult {
                id: target.id.clone(),
                is_lb: target.is_lb,
                healthy: false,
                paused: false,
                status: "offline",
                status_code: None,
                latency_ms: start.elapsed().as_secs_f64() * 1000.0,
                error: Some(e.to_string()),
            };
        }
    };

    let _ = stream.set_read_timeout(Some(timeout));
    let _ = stream.set_write_timeout(Some(timeout));

    let req = format!(
        "GET {} HTTP/1.1\r\nHost: {}:{}\r\nConnection: close\r\nUser-Agent: bifrost-probe/0.1\r\n\r\n",
        target.path, target.host, target.port
    );

    if let Err(e) = stream.write_all(req.as_bytes()) {
        return ProbeResult {
            id: target.id.clone(),
            is_lb: target.is_lb,
            healthy: false,
            paused: false,
            status: "offline",
            status_code: None,
            latency_ms: start.elapsed().as_secs_f64() * 1000.0,
            error: Some(format!("write failed: {e}")),
        };
    }

    let mut buf = [0u8; 4096];
    let mut total = 0usize;
    loop {
        match stream.read(&mut buf[total..]) {
            Ok(0) => break,
            Ok(n) => {
                total += n;
                if total >= buf.len() {
                    break;
                }
            }
            Err(_) if total > 0 => break,
            Err(e) => {
                return ProbeResult {
                    id: target.id.clone(),
                    is_lb: target.is_lb,
                    healthy: false,
                    paused: false,
                    status: "offline",
                    status_code: None,
                    latency_ms: start.elapsed().as_secs_f64() * 1000.0,
                    error: Some(format!("read failed: {e}")),
                };
            }
        }
    }

    let elapsed = start.elapsed().as_secs_f64() * 1000.0;
    let raw = String::from_utf8_lossy(&buf[..total]);
    let status_code = parse_http_status_code(&raw);
    let body = raw.split_once("\r\n\r\n").map(|(_, b)| b).unwrap_or("");
    let paused = body.contains("\"paused\":true") || body.contains("\"status\":\"paused\"");
    let ok = matches!(status_code, Some(200..=299));

    ProbeResult {
        id: target.id.clone(),
        is_lb: target.is_lb,
        healthy: ok,
        paused,
        status: if ok {
            if paused { "paused" } else { "healthy" }
        } else {
            "unhealthy"
        },
        status_code,
        latency_ms: (elapsed * 10.0).round() / 10.0,
        error: if ok {
            None
        } else {
            Some(format!("HTTP {}", status_code.map_or_else(|| "invalid".to_string(), |c| c.to_string())))
        },
    }
}

fn probe_all(targets: &[ProbeTarget], timeout: Duration) -> Vec<ProbeResult> {
    let mut handles = Vec::with_capacity(targets.len());
    for target in targets {
        let t = target.clone();
        handles.push(thread::spawn(move || probe_single(&t, timeout)));
    }
    handles
        .into_iter()
        .filter_map(|h| h.join().ok())
        .collect()
}

fn format_json_snapshot(results: &[ProbeResult]) -> String {
    let lb = results.iter().find(|r| r.is_lb);
    let servers: Vec<&ProbeResult> = results.iter().filter(|r| !r.is_lb).collect();

    let lb_json = match lb {
        Some(r) => format!(
            "{{\"id\":\"{}\",\"online\":{},\"paused\":{},\"status\":\"{}\",\"status_code\":{},\"latency_ms\":{:.1},\"error\":{}}}",
            escape_json(&r.id),
            r.healthy,
            r.paused,
            r.status,
            r.status_code.map_or_else(|| "null".to_string(), |c| c.to_string()),
            r.latency_ms,
            r.error.as_ref().map_or_else(|| "null".to_string(), |e| format!("\"{}\"", escape_json(e)))
        ),
        None => "null".to_string(),
    };

    let srv_items: Vec<String> = servers
        .iter()
        .map(|r| {
            format!(
                "{{\"id\":\"{}\",\"healthy\":{},\"status\":\"{}\",\"status_code\":{},\"latency_ms\":{:.1},\"error\":{}}}",
                escape_json(&r.id),
                r.healthy,
                r.status,
                r.status_code.map_or_else(|| "null".to_string(), |c| c.to_string()),
                r.latency_ms,
                r.error.as_ref().map_or_else(|| "null".to_string(), |e| format!("\"{}\"", escape_json(e)))
            )
        })
        .collect();

    format!(
        "{{\"source\":\"rust-probe\",\"timestamp_ms\":{},\"lb\":{},\"servers\":[{}]}}",
        now_millis(),
        lb_json,
        srv_items.join(",")
    )
}

fn run_http_server(port: u16, targets: Vec<ProbeTarget>, timeout: Duration, interval: Duration) {
    let initial = format_json_snapshot(&probe_all(&targets, timeout));
    let snapshot = Arc::new(RwLock::new(initial));
    let bg_snapshot = Arc::clone(&snapshot);
    let bg_targets = targets.clone();

    thread::spawn(move || loop {
        let next = format_json_snapshot(&probe_all(&bg_targets, timeout));
        if let Ok(mut guard) = bg_snapshot.write() {
            *guard = next;
        }
        thread::sleep(interval);
    });

    let listener = TcpListener::bind(("0.0.0.0", port))
        .unwrap_or_else(|e| panic!("failed to bind 0.0.0.0:{port}: {e}"));

    for stream in listener.incoming().flatten() {
        let snap = Arc::clone(&snapshot);
        thread::spawn(move || handle_http_client(stream, snap));
    }
}

fn handle_http_client(mut stream: TcpStream, snapshot: Arc<RwLock<String>>) {
    let mut req_buf = [0u8; 1024];
    let _ = stream.read(&mut req_buf);
    let body = snapshot.read().map(|s| s.clone()).unwrap_or_else(|_| "{}".to_string());
    let resp = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(resp.as_bytes());
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut serve = false;
    let mut port: u16 = env::var("PROBE_PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(5050);
    let mut timeout_ms: u64 = 1800;
    let mut interval_ms: u64 = 2500;
    let mut targets_raw = env::var("BIFROST_PROBE_TARGETS").unwrap_or_else(|_| DEFAULT_TARGETS.to_string());

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--serve" => serve = true,
            "--once" => serve = false,
            "--port" if i + 1 < args.len() => {
                i += 1;
                port = args[i].parse().unwrap_or(5050);
            }
            "--timeout-ms" if i + 1 < args.len() => {
                i += 1;
                timeout_ms = args[i].parse().unwrap_or(1800);
            }
            "--interval-ms" if i + 1 < args.len() => {
                i += 1;
                interval_ms = args[i].parse().unwrap_or(2500);
            }
            "--targets" if i + 1 < args.len() => {
                i += 1;
                targets_raw = args[i].clone();
            }
            _ => {}
        }
        i += 1;
    }

    let targets = parse_targets_list(&targets_raw);
    let timeout = Duration::from_millis(timeout_ms.max(200));

    if serve {
        run_http_server(port, targets, timeout, Duration::from_millis(interval_ms.max(500)));
    } else {
        let results = probe_all(&targets, timeout);
        println!("{}", format_json_snapshot(&results));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_targets_cleanly() {
        let t1 = parse_target("lb=http://20.244.34.101:5000/gateway-health").unwrap();
        assert_eq!(t1.id, "lb");
        assert!(t1.is_lb);
        assert_eq!(t1.host, "20.244.34.101");
        assert_eq!(t1.port, 5000);
        assert_eq!(t1.path, "/gateway-health");

        let t2 = parse_target("server-1=http://52.172.229.225:5001").unwrap();
        assert_eq!(t2.id, "server-1");
        assert!(!t2.is_lb);
        assert_eq!(t2.port, 5001);
        assert_eq!(t2.path, "/health");
    }

    #[test]
    fn probes_live_local_listener_and_closed_port() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let live_port = listener.local_addr().unwrap().port();

        thread::spawn(move || {
            if let Ok((mut conn, _)) = listener.accept() {
                let mut buf = [0u8; 512];
                let _ = conn.read(&mut buf);
                let _ = conn.write_all(
                    b"HTTP/1.1 200 OK\r\nContent-Length: 19\r\n\r\n{\"status\":\"healthy\"}",
                );
            }
        });

        // Allocate and immediately drop a listener to guarantee a closed port
        let dead_listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let dead_port = dead_listener.local_addr().unwrap().port();
        drop(dead_listener);

        let targets = vec![
            parse_target(&format!("server-1=http://127.0.0.1:{live_port}/health")).unwrap(),
            parse_target(&format!("server-2=http://127.0.0.1:{dead_port}/health")).unwrap(),
        ];

        let results = probe_all(&targets, Duration::from_millis(800));
        assert_eq!(results.len(), 2);
        assert!(results[0].healthy);
        assert_eq!(results[0].status, "healthy");
        assert!(!results[1].healthy);
        assert_eq!(results[1].status, "offline");
    }
}
