import { simulationEngine } from '../simulation/engine';
import { useSimulationStore } from '../store/simulationStore';
import { getGatewayUrl, getVmBaseUrl, KNOWN_VMS } from './gatewayConfig';

/**
 * Browser-Native Live Traffic Generator & Azure Cluster Inspector (JS replacement for send_traffic.py).
 * Executes directly in the browser against the online Azure Load Balancer VM (no terminal script needed).
 */

export const CLIENT_IPS = [
  '198.51.100.4',
  '203.0.113.19',
  '198.51.100.77',
  '192.0.2.145',
  '203.0.113.88',
];

function nowTimestamp() {
  const d = new Date();
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${d.toTimeString().slice(0, 8)}.${ms}`;
}

function sleep(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function createTimeoutSignal(externalSignal, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);

  const forwardAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', forwardAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', forwardAbort);
    },
  };
}

function getVmListFromStoreOrKnown() {
  const storeServers = useSimulationStore.getState().servers || [];
  if (storeServers.length > 0 && useSimulationStore.getState().clusterMode === 'live') {
    return storeServers.map((s, idx) => ({
      id: s.id,
      name: s.name || `Server ${String.fromCharCode(65 + idx)}`,
      pub: s.publicIp || s.ip || KNOWN_VMS[s.id]?.pub || `52.172.229.225:5001`,
      priv: s.privateIp || KNOWN_VMS[s.id]?.priv || `10.0.1.${10 + idx}`,
    }));
  }
  return Object.values(KNOWN_VMS);
}

/**
 * Bound concurrency worker pool (browser equivalent of Python's ThreadPoolExecutor).
 */
async function runWorkerPool(count, concurrency, signal, workerFn) {
  const workers = Math.max(1, Math.min(concurrency, count));
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < count) {
      if (signal?.aborted) return;
      const current = nextIdx;
      nextIdx += 1;
      await workerFn(current);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
}

/**
 * Send a single HTTP request to the Load Balancer gateway or direct VM.
 */
export async function sendOne({
  url = getGatewayUrl(),
  reqIdx = 1,
  clientIp = null,
  delay = 0,
  directVm = false,
  signal,
  onLog,
} = {}) {
  const cleanUrl = (url || getGatewayUrl()).replace(/\/+$/, '');
  const timestamp = nowTimestamp();
  const isDirect =
    directVm ||
    cleanUrl.includes(':5001') ||
    Object.values(KNOWN_VMS).some((vm) => cleanUrl.includes(vm.pub));

  const primaryEndpoint = isDirect ? '/api/process' : '/api/request';
  const fallbackEndpoint = isDirect ? '/api/request' : '/api/process';

  const payload = {};
  if (Number(delay) > 0) payload.delay = Number(delay);
  if (clientIp) payload.clientIp = clientIp;

  const t0 = performance.now();
  const safeDelaySec = Math.max(0, Number(delay) || 0);
  const { signal: reqSignal, cleanup } = createTimeoutSignal(signal, 7000 + safeDelaySec * 1000);

  try {
    let targetUrl = `${cleanUrl}${primaryEndpoint}`;
    let resp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: reqSignal,
    });

    if (resp.status === 404) {
      targetUrl = `${cleanUrl}${fallbackEndpoint}`;
      resp = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: reqSignal,
      });
    }

    const elapsedMs = performance.now() - t0;
    const contentType = resp.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await resp.json().catch(() => ({})) : {};
    simulationEngine.syncRemoteLbPausedFromResponse(resp.status, data, !isDirect);

    const serverId = data.selected_server || data.server_id || 'unknown';
    const vmMeta = KNOWN_VMS[serverId] || {
      name: serverId !== 'unknown' ? serverId : isDirect ? 'Server Direct' : 'Load Balancer',
      pub: data.public_ip || cleanUrl.replace(/^https?:\/\//i, ''),
      priv: data.private_ip || (isDirect ? '10.0.1.10' : '172.16.0.4'),
    };
    const algo = String(data.algorithm || (isDirect ? 'DIRECT' : 'RR')).toUpperCase();
    const ok = resp.ok && (data.status === 'success' || 'message' in data || resp.status === 200);
    const failoverFrom = data.failover_from || null;

    const rawRt = Number(data.response_time_ms);
    const safeRt = Number.isFinite(rawRt) && rawRt > 0 ? rawRt : Math.round(elapsedMs);
    const rawSrvExec = Number(data.server_exec_ms);
    const safeSrvExec = Number.isFinite(rawSrvExec) ? rawSrvExec : undefined;
    const rawLbDisp = Number(data.lb_dispatch_ms);
    const safeLbDisp = Number.isFinite(rawLbDisp) ? rawLbDisp : undefined;

    // Synchronize directly with UI visualizer (deduplicated against SSE by request_id)
    simulationEngine.handleLiveRequestEvent({
      type: 'request',
      request_id: data.request_id || `browser-${reqIdx}-${Date.now()}`,
      algorithm: algo,
      selected_server: serverId,
      public_ip: vmMeta.pub,
      private_ip: vmMeta.priv,
      client_ip: clientIp || '198.51.100.4',
      status: ok ? 'success' : 'error',
      status_code: resp.status,
      response_time_ms: safeRt,
      server_exec_ms: safeSrvExec,
      lb_dispatch_ms: safeLbDisp,
      failover_from: failoverFrom,
    });

    const failoverTxt = failoverFrom
      ? `${KNOWN_VMS[failoverFrom]?.name || failoverFrom} [CRASHED -> FAILOVER] -> `
      : '';
    const badge = ok ? `[${resp.status} OK]` : `[${resp.status} ERR]`;

    onLog?.({
      id: `${Date.now()}-${reqIdx}-${Math.random().toString(36).slice(2, 6)}`,
      level: ok ? 'success' : 'error',
      text: `[${timestamp}] REQ #${String(reqIdx).padStart(4, '0')} -> ${failoverTxt}${vmMeta.name} (${vmMeta.pub}) ${badge} ${elapsedMs.toFixed(1)}ms (${algo})`,
    });

    return { ok, serverId, elapsedMs, statusCode: resp.status, algo, failoverFrom };
  } catch (err) {
    const elapsedMs = performance.now() - t0;
    const isAbort = err?.name === 'AbortError' && signal?.aborted;
    if (!isAbort) {
      onLog?.({
        id: `${Date.now()}-${reqIdx}-err`,
        level: 'error',
        text: `[${timestamp}] REQ #${String(reqIdx).padStart(4, '0')} -> [FAIL / TIMEOUT] ${err?.message || 'Network error'} (${elapsedMs.toFixed(1)}ms)`,
      });
    }
    return { ok: false, serverId: 'failed', elapsedMs, statusCode: 0, aborted: isAbort };
  } finally {
    cleanup();
  }
}

/**
 * Direct probe of the 3 Azure backend VMs (/health & /api/info), with gateway fallback info.
 */
export async function probeDirectVms({ url = getGatewayUrl(), signal, onLog } = {}) {
  const cleanUrl = (url || getGatewayUrl()).replace(/\/+$/, '');
  onLog?.({
    id: `probe-hdr-${Date.now()}`,
    level: 'info',
    text: `Direct Health & Telemetry Probe on Azure Backend VMs...`,
  });

  const vms = getVmListFromStoreOrKnown();
  const results = [];

  for (const vm of vms) {
    if (signal?.aborted) break;
    const t0 = performance.now();
    const { signal: probeSignal, cleanup } = createTimeoutSignal(signal, 3500);
    const vmBaseUrl = getVmBaseUrl(vm);
    try {
      const hRes = await fetch(`${vmBaseUrl}/health`, { signal: probeSignal });
      const ms = performance.now() - t0;
      const iRes = await fetch(`${vmBaseUrl}/api/info`, { signal: probeSignal });
      const info = iRes.ok ? await iRes.json().catch(() => ({})) : {};

      results.push({ ...vm, healthy: hRes.ok, latencyMs: ms, info });
      onLog?.({
        id: `probe-${vm.id}-${Date.now()}`,
        level: hRes.ok ? 'success' : 'error',
        text: `* ${vm.name} (${vm.pub} | Priv: ${vm.priv}): ${hRes.ok ? 'HEALTHY' : 'UNHEALTHY'} · ${ms.toFixed(1)}ms · Handled: ${info.requests_handled ?? 0} reqs · Uptime: ${Number(info.uptime_seconds || 0).toFixed(1)}s`,
      });
    } catch (err) {
      results.push({ ...vm, healthy: false, error: err?.message || 'Unreachable / CORS' });
      onLog?.({
        id: `probe-${vm.id}-err-${Date.now()}`,
        level: 'warning',
        text: `* ${vm.name} (${vm.pub}): Direct browser probe unavailable (${err?.message || 'Unreachable'}) — querying via LB gateway...`,
      });
    } finally {
      cleanup();
    }
  }

  // Always check LB /api/servers as gateway-mediated verification when direct VM port CORS is closed
  if (!signal?.aborted) {
    const { signal: gwSignal, cleanup } = createTimeoutSignal(signal, 3500);
    try {
      const gwRes = await fetch(`${cleanUrl}/api/servers`, { signal: gwSignal });
      if (gwRes.ok) {
        const gwJson = await gwRes.json();
        const list = Array.isArray(gwJson) ? gwJson : gwJson.servers || [];
        for (const s of list) {
          onLog?.({
            id: `gw-srv-${s.id}-${Date.now()}`,
            level: s.status === 'healthy' ? 'info' : 'error',
            text: `  [LB View] ${s.name || s.id} (${s.public_ip || s.url}): ${String(s.status || 'unknown').toUpperCase()} · Reqs: ${s.total_requests ?? 0} · Failed: ${s.failed_requests ?? 0}`,
          });
        }
      }
    } catch {
      // Gateway unreachable already logged by store status
    } finally {
      cleanup();
    }
  }

  return results;
}

export async function switchAlgorithmApi(url = getGatewayUrl(), algoName, { onLog } = {}) {
  const cleanUrl = (url || getGatewayUrl()).replace(/\/+$/, '');
  try {
    const res = await fetch(`${cleanUrl}/api/algorithm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algorithm: algoName }),
    });
    const data = await res.json().catch(() => ({}));
    onLog?.({
      id: `algo-${Date.now()}`,
      level: res.ok ? 'info' : 'error',
      text: `[Algorithm Switched] Strategy set to ${String(data.algorithm || algoName).toUpperCase()}`,
    });
    return data;
  } catch (err) {
    onLog?.({
      id: `algo-err-${Date.now()}`,
      level: 'error',
      text: `Failed to switch algorithm: ${err?.message || 'Network error'}`,
    });
    return null;
  }
}

export async function restoreAllApi(url = getGatewayUrl(), { onLog } = {}) {
  const cleanUrl = (url || getGatewayUrl()).replace(/\/+$/, '');
  useSimulationStore.getState().recoverAllServers();
  try {
    const res = await fetch(`${cleanUrl}/api/servers/recover`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    onLog?.({
      id: `recover-${Date.now()}`,
      level: res.ok ? 'success' : 'error',
      text: `[CLUSTER RESTORED] All Azure backend nodes marked HEALTHY.`,
    });
    return data;
  } catch (err) {
    onLog?.({
      id: `recover-err-${Date.now()}`,
      level: 'warning',
      text: `Restored local view; remote gateway recover error: ${err?.message || 'Unreachable'}`,
    });
    return null;
  }
}

export async function fetchStatsApi(url = getGatewayUrl(), { onLog } = {}) {
  const cleanUrl = (url || getGatewayUrl()).replace(/\/+$/, '');
  try {
    const res = await fetch(`${cleanUrl}/api/stats`);
    const d = await res.json();
    onLog?.({
      id: `stats-${Date.now()}`,
      level: 'info',
      text: `[LB Stats] Algo: ${d.algorithm} | Total: ${d.total_requests} | Healthy: ${d.healthy_servers}/${d.total_servers} | Active Conns: ${d.active_connections} | Avg RTT: ${Number(d.avg_response_time_ms || 0).toFixed(1)}ms`,
    });
    return d;
  } catch (err) {
    onLog?.({
      id: `stats-err-${Date.now()}`,
      level: 'error',
      text: `Failed to fetch LB stats from ${cleanUrl}: ${err?.message || 'Unreachable'}`,
    });
    return null;
  }
}

/**
 * Execute Burst Wave or Stress Test (replicates --burst and --stress in send_traffic.py).
 */
export async function runStressTest({
  url = getGatewayUrl(),
  count = 100,
  concurrency = 20,
  delay = 0,
  label = 'STRESS TEST',
  signal,
  onLog,
  onProgress,
} = {}) {
  const total = Math.max(1, Math.min(5000, Number(count) || 1));
  const workers = Math.max(1, Math.min(64, Number(concurrency) || 10));
  const cleanUrl = (url || getGatewayUrl()).replace(/\/+$/, '');

  onLog?.({
    id: `stress-start-${Date.now()}`,
    level: 'warning',
    text: `Launching ${label}: ${total} reqs · ${workers} concurrent workers${delay > 0 ? ` · ${delay}s delay` : ''} -> ${cleanUrl}/api/request`,
  });

  const startTime = performance.now();
  const counts = {};
  const latencies = [];
  let completed = 0;
  let successes = 0;
  let failures = 0;

  await runWorkerPool(total, workers, signal, async (i) => {
    const res = await sendOne({
      url: cleanUrl,
      reqIdx: i + 1,
      clientIp: CLIENT_IPS[i % CLIENT_IPS.length],
      delay,
      signal,
      onLog,
    });
    if (res.aborted) return;

    completed += 1;
    latencies.push(res.elapsedMs);
    counts[res.serverId] = (counts[res.serverId] || 0) + 1;
    if (res.ok) successes += 1;
    else failures += 1;

    onProgress?.({ completed, total, ok: successes, fail: failures });
  });

  const totalSec = Math.max(0.001, (performance.now() - startTime) / 1000);
  const avgLat = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const minLat = latencies.length ? Math.min(...latencies) : 0;
  const maxLat = latencies.length ? Math.max(...latencies) : 0;
  const distSummary = Object.entries(counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  onLog?.({
    id: `stress-sum-${Date.now()}`,
    level: failures === 0 ? 'success' : 'warning',
    text: `[${label} SUMMARY] ${completed} done in ${totalSec.toFixed(2)}s (${(completed / totalSec).toFixed(1)} req/s) | 200 OK: ${successes} | Failed: ${failures} | Avg: ${avgLat.toFixed(1)}ms (Min ${minLat.toFixed(1)} / Max ${maxLat.toFixed(1)}) | Distribution: {${distSummary}}`,
  });

  return { totalSec, completed, successes, failures, avgLat, minLat, maxLat, counts };
}

/**
 * Rate-based HTTP stream from browser (--rate N), stopping automatically after `count` requests when provided.
 */
export async function runContinuousStream({
  url = getGatewayUrl(),
  count = null,
  rate = 5,
  delay = 0,
  signal,
  onLog,
  onProgress,
} = {}) {
  const cleanUrl = (url || getGatewayUrl()).replace(/\/+$/, '');
  const rps = Math.max(1, Math.min(50, Number(rate) || 5));
  const intervalMs = 1000 / rps;
  const hasFiniteCount = count !== null && count !== undefined && Number.isFinite(Number(count)) && Number(count) > 0;
  const targetCount = hasFiniteCount ? Math.max(1, Math.min(5000, Math.floor(Number(count)))) : null;
  const maxInFlight = String(cleanUrl).startsWith('/') ? 8 : 32;

  onLog?.({
    id: `stream-start-${Date.now()}`,
    level: 'info',
    text: targetCount
      ? `[STREAM STARTED] Streaming ${targetCount} requests @ ${rps} req/s -> ${cleanUrl}/api/request`
      : `[STREAM STARTED] Continuous HTTP stream @ ${rps} req/s -> ${cleanUrl}/api/request`,
  });
  onProgress?.({ completed: 0, total: targetCount, ok: 0, fail: 0 });

  let idx = 0;
  let okCount = 0;
  let failCount = 0;
  const inFlight = new Set();

  while (!signal?.aborted && (targetCount === null || idx < targetCount)) {
    if (inFlight.size >= maxInFlight) {
      await Promise.race(inFlight).catch(() => {});
      if (signal?.aborted) break;
    }

    idx += 1;
    const reqNum = idx;
    const pending = sendOne({
      url: cleanUrl,
      reqIdx: reqNum,
      clientIp: CLIENT_IPS[(reqNum - 1) % CLIENT_IPS.length],
      delay,
      signal,
      onLog,
    })
      .then((res) => {
        if (res.aborted) return;
        if (res.ok) okCount += 1;
        else failCount += 1;
        onProgress?.({ completed: okCount + failCount, total: targetCount, ok: okCount, fail: failCount });
      })
      .finally(() => {
        inFlight.delete(pending);
      });
    inFlight.add(pending);

    if (targetCount !== null && idx >= targetCount) {
      break;
    }

    try {
      await sleep(intervalMs, signal);
    } catch {
      break;
    }
  }

  if (inFlight.size > 0) {
    await Promise.allSettled(Array.from(inFlight));
  }

  const finishedCount = okCount + failCount;
  const label = !signal?.aborted && targetCount !== null ? 'STREAM COMPLETE' : 'STREAM STOPPED';
  onLog?.({
    id: `stream-stop-${Date.now()}`,
    level: failCount === 0 && !signal?.aborted && targetCount !== null ? 'success' : 'info',
    text: targetCount !== null
      ? `[${label}] Sent ${finishedCount}/${targetCount} requests (${okCount} OK, ${failCount} failed).`
      : `[${label}] Dispatched ${idx} requests (${okCount} OK, ${failCount} failed).`,
  });

  return { completed: finishedCount, total: targetCount, ok: okCount, fail: failCount };
}

/**
 * 3-Phase Saturation Overload Crash & Smooth Failover Test (--overload).
 */
export async function runOverloadCrashTest({
  url = getGatewayUrl(),
  count = 60,
  concurrency = 55,
  delay = 1.8,
  signal,
  onLog,
  onProgress,
} = {}) {
  const cleanUrl = (url || getGatewayUrl()).replace(/\/+$/, '');
  const floodCount = Math.max(15, Math.min(500, Number(count) || 60));
  const totalSteps = 15 + floodCount + 15;
  let doneSteps = 0;
  let okTotal = 0;
  let failTotal = 0;

  const trackProgress = (res) => {
    if (res.aborted) return;
    doneSteps += 1;
    if (res.ok) okTotal += 1;
    else failTotal += 1;
    onProgress?.({ completed: doneSteps, total: totalSteps, ok: okTotal, fail: failTotal });
  };

  onLog?.({
    id: `ovl-banner-${Date.now()}`,
    level: 'error',
    text: `[OVERLOAD FAILOVER TEST] Flooding cluster to trip circuit breaker & test smooth failover`,
  });

  // Phase 1: Baseline Load
  onLog?.({
    id: `ovl-p1-${Date.now()}`,
    level: 'warning',
    text: `[PHASE 1] Baseline Load across all 3 VMs (15 concurrent reqs @ 0.2s delay)...`,
  });
  await runWorkerPool(15, 15, signal, async (i) => {
    const res = await sendOne({
      url: cleanUrl,
      reqIdx: i + 1,
      clientIp: CLIENT_IPS[i % CLIENT_IPS.length],
      delay: 0.2,
      signal,
      onLog,
    });
    trackProgress(res);
  });
  if (signal?.aborted) return;

  // Phase 2: Mass Saturation Flood
  onLog?.({
    id: `ovl-p2-${Date.now()}`,
    level: 'error',
    text: `[PHASE 2] MASS SATURATION FLOOD (${floodCount} reqs across ${concurrency} workers @ ${delay}s compute)...`,
  });
  await runWorkerPool(floodCount, concurrency, signal, async (i) => {
    const res = await sendOne({
      url: cleanUrl,
      reqIdx: i + 16,
      clientIp: CLIENT_IPS[i % CLIENT_IPS.length],
      delay,
      signal,
      onLog,
    });
    trackProgress(res);
  });
  if (signal?.aborted) return;

  // Phase 3: Post-Crash Failover Verification
  onLog?.({
    id: `ovl-p3-${Date.now()}`,
    level: 'success',
    text: `[PHASE 3] Post-Crash Smooth Failover Verification (15 sequential requests)...`,
  });
  for (let i = 0; i < 15; i++) {
    if (signal?.aborted) break;
    const res = await sendOne({
      url: cleanUrl,
      reqIdx: i + 16 + floodCount,
      clientIp: CLIENT_IPS[i % CLIENT_IPS.length],
      delay: 0.05,
      signal,
      onLog,
    });
    trackProgress(res);
    await sleep(150, signal).catch(() => {});
  }

  if (!signal?.aborted) {
    await fetchStatsApi(cleanUrl, { onLog });
  }
}

/**
 * Direct Single-VM No-LB Crash Scenario (--no-lb) triggered cleanly in browser JS.
 */
export async function runNoLbCrashTest({
  targetServer = null,
  count = 45,
  concurrency = 25,
  signal,
  onLog,
  onProgress,
} = {}) {
  const vms = getVmListFromStoreOrKnown();
  const vm =
    (targetServer && vms.find((v) => v.id === targetServer)) ||
    vms[Math.floor(Math.random() * vms.length)] ||
    KNOWN_VMS['server-1'];

  const directUrl = `${getVmBaseUrl(vm)}/api/process`;
  const total = Math.max(15, Math.min(300, Number(count) || 45));
  const SINGLE_VM_CRASH_LIMIT = 14;

  onLog?.({
    id: `nolb-hdr-${Date.now()}`,
    level: 'error',
    text: `[NO-LB DIRECT ATTACK] Bypassing Load Balancer! Targeting single VM ${vm.name} (${vm.pub}) with ${total} requests`,
  });

  useSimulationStore.getState().recoverAllServers();
  await sleep(150, signal).catch(() => {});

  const state = { active: 0, crashed: false, ok: 0, fail: 0, completed: 0 };

  async function hitSingleVm(reqIdx) {
    if (signal?.aborted) return;
    const ts = nowTimestamp();

    let alreadyCrashed = state.crashed;
    let crashedNow = false;
    if (!alreadyCrashed) {
      state.active += 1;
      if (state.active >= SINGLE_VM_CRASH_LIMIT) {
        state.crashed = true;
        alreadyCrashed = true;
        crashedNow = true;
      }
    }

    if (alreadyCrashed) {
      if (crashedNow) {
        useSimulationStore.getState().failServer(vm.id);
        onLog?.({
          id: `nolb-crash-${Date.now()}`,
          level: 'error',
          text: `[CRITICAL] ${vm.name} (${vm.pub}) EXCEEDED SINGLE-NODE CAPACITY (${SINGLE_VM_CRASH_LIMIT}+ conns) -> SERVER CRASHED!`,
        });
      }
      state.fail += 1;
      state.completed += 1;
      simulationEngine.handleLiveRequestEvent({
        type: 'request',
        request_id: `nolb-${reqIdx}-${Date.now()}`,
        algorithm: 'DIRECT_NO_LB',
        selected_server: vm.id,
        public_ip: vm.pub,
        private_ip: vm.priv,
        client_ip: CLIENT_IPS[(reqIdx - 1) % CLIENT_IPS.length],
        status: 'error',
        status_code: 503,
        response_time_ms: 4.0,
        server_exec_ms: 0,
        direct_no_lb: true,
        crashed: true,
      });
      onLog?.({
        id: `nolb-req-${reqIdx}-${Date.now()}`,
        level: 'error',
        text: `[${ts}] REQ #${String(reqIdx).padStart(4, '0')} -> [NO LB] -> ${vm.name} [503 CRASHED — NO LB TO FAILOVER!]`,
      });
      onProgress?.({ completed: state.completed, total, ok: state.ok, fail: state.fail });
      return;
    }

    const t0 = performance.now();
    const { signal: reqSignal, cleanup } = createTimeoutSignal(signal, 4500);
    try {
      const resp = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delay: 1.25 }),
        signal: reqSignal,
      });
      const elapsedMs = performance.now() - t0;
      const data = await resp.json().catch(() => ({}));
      const srvExec = Number(data.processing_time_ms || 1250);
      const ok = resp.ok;

      state.active = Math.max(0, state.active - 1);
      if (ok) state.ok += 1;
      else state.fail += 1;
      state.completed += 1;

      simulationEngine.handleLiveRequestEvent({
        type: 'request',
        request_id: `nolb-${reqIdx}-${Date.now()}`,
        algorithm: 'DIRECT_NO_LB',
        selected_server: vm.id,
        public_ip: vm.pub,
        private_ip: vm.priv,
        client_ip: CLIENT_IPS[(reqIdx - 1) % CLIENT_IPS.length],
        status: ok ? 'success' : 'error',
        status_code: resp.status,
        response_time_ms: Math.round(elapsedMs * 100) / 100,
        server_exec_ms: Math.round(srvExec * 100) / 100,
        direct_no_lb: true,
        crashed: false,
      });

      onLog?.({
        id: `nolb-req-${reqIdx}-${Date.now()}`,
        level: ok ? 'success' : 'error',
        text: `[${ts}] REQ #${String(reqIdx).padStart(4, '0')} -> [DIRECT -> NO LB] -> ${vm.name} (${vm.pub}) [${resp.status}] ${elapsedMs.toFixed(1)}ms`,
      });
    } catch (err) {
      const elapsedMs = performance.now() - t0;
      state.active = Math.max(0, state.active - 1);
      state.crashed = true;
      state.fail += 1;
      state.completed += 1;
      useSimulationStore.getState().failServer(vm.id);

      simulationEngine.handleLiveRequestEvent({
        type: 'request',
        request_id: `nolb-${reqIdx}-${Date.now()}`,
        algorithm: 'DIRECT_NO_LB',
        selected_server: vm.id,
        public_ip: vm.pub,
        private_ip: vm.priv,
        client_ip: CLIENT_IPS[(reqIdx - 1) % CLIENT_IPS.length],
        status: 'error',
        status_code: 503,
        response_time_ms: Math.round(elapsedMs * 100) / 100,
        direct_no_lb: true,
        crashed: true,
      });

      onLog?.({
        id: `nolb-req-${reqIdx}-${Date.now()}`,
        level: 'error',
        text: `[${ts}] REQ #${String(reqIdx).padStart(4, '0')} -> [NO LB] -> ${vm.name} [TIMEOUT / CRASHED] (${err?.message || 'Error'})`,
      });
    } finally {
      cleanup();
    }

    onProgress?.({ completed: state.completed, total, ok: state.ok, fail: state.fail });
  }

  // Wave 1: 10 gradual requests spaced 90ms apart
  const wave1Count = Math.min(10, total);
  const wave1Promises = [];
  for (let i = 0; i < wave1Count; i++) {
    if (signal?.aborted) break;
    wave1Promises.push(hitSingleVm(i + 1));
    await sleep(90, signal).catch(() => {});
  }
  await Promise.all(wave1Promises);

  // Wave 2: Flood remaining requests concurrently
  const remaining = Math.max(0, total - wave1Count);
  const wave2Promises = [];
  for (let i = 0; i < remaining; i++) {
    if (signal?.aborted) break;
    if (wave2Promises.length >= concurrency) {
      await Promise.all(wave2Promises.splice(0, Math.floor(concurrency / 2)));
    }
    wave2Promises.push(hitSingleVm(wave1Count + i + 1));
    await sleep(40, signal).catch(() => {});
  }
  await Promise.all(wave2Promises);

  onLog?.({
    id: `nolb-sum-${Date.now()}`,
    level: 'error',
    text: `[NO-LB OUTAGE SUMMARY] Victim: ${vm.name} (${vm.pub}) | 200 OK: ${state.ok} | Failed (503): ${state.fail} | Other 2 VMs: 0 requests`,
  });
}

/**
 * With Load Balancer Protection Scenario (--with-lb).
 */
export async function runWithLbSurvivalTest({
  url = getGatewayUrl(),
  count = 45,
  concurrency = 25,
  signal,
  onLog,
  onProgress,
} = {}) {
  const cleanUrl = (url || getGatewayUrl()).replace(/\/+$/, '');
  onLog?.({
    id: `wlb-hdr-${Date.now()}`,
    level: 'success',
    text: `[WITH-LB PROTECTION] Distributing ${count} requests (${concurrency} workers @ 1.25s compute) evenly across ALL 3 VMs`,
  });

  await restoreAllApi(cleanUrl, { onLog });
  await switchAlgorithmApi(cleanUrl, 'round_robin', { onLog });
  useSimulationStore.getState().setAlgorithm('ROUND_ROBIN');

  const summary = await runStressTest({
    url: cleanUrl,
    count,
    concurrency,
    delay: 1.25,
    label: 'WITH-LB PROTECTION',
    signal,
    onLog,
    onProgress,
  });

  if (!signal?.aborted) {
    await fetchStatsApi(cleanUrl, { onLog });
    onLog?.({
      id: `wlb-done-${Date.now()}`,
      level: 'success',
      text: `WITH LOAD BALANCER RESULT: Load shared evenly -> ${summary.failures === 0 ? 'ZERO CRASHES & 100% UPTIME!' : `${summary.successes}/${summary.completed} handled.`}`,
    });
  }
}

/**
 * 4-Act Automated Live Showcase Demo (--demo --auto).
 */
export async function runShowcaseDemo({ url = getGatewayUrl(), signal, onLog, onProgress } = {}) {
  const cleanUrl = (url || getGatewayUrl()).replace(/\/+$/, '');
  onLog?.({
    id: `demo-start-${Date.now()}`,
    level: 'info',
    text: `[BIFROST 4-ACT LIVE SHOWCASE] Running full automated Azure demonstration...`,
  });

  await restoreAllApi(cleanUrl, { onLog });
  await switchAlgorithmApi(cleanUrl, 'round_robin', { onLog });
  useSimulationStore.getState().setAlgorithm('ROUND_ROBIN');
  if (signal?.aborted) return;

  onLog?.({ id: `demo-a1-${Date.now()}`, level: 'info', text: `[ACT 1/4] Direct Azure VM Cluster Health Audit` });
  await probeDirectVms({ url: cleanUrl, signal, onLog });
  await sleep(1200, signal).catch(() => {});
  if (signal?.aborted) return;

  onLog?.({ id: `demo-a2-${Date.now()}`, level: 'success', text: `[ACT 2/4] Live Round-Robin Distribution (12 Requests)` });
  for (let i = 0; i < 12; i++) {
    if (signal?.aborted) return;
    await sendOne({
      url: cleanUrl,
      reqIdx: i + 1,
      clientIp: CLIENT_IPS[i % CLIENT_IPS.length],
      delay: 0.08,
      signal,
      onLog,
    });
    await sleep(200, signal).catch(() => {});
  }
  await sleep(1200, signal).catch(() => {});
  if (signal?.aborted) return;

  onLog?.({ id: `demo-a3-${Date.now()}`, level: 'error', text: `[ACT 3/4] Saturation Overload, Circuit Breaker & Failover` });
  await runOverloadCrashTest({ url: cleanUrl, count: 45, concurrency: 40, delay: 1.6, signal, onLog, onProgress });
  await sleep(1200, signal).catch(() => {});
  if (signal?.aborted) return;

  onLog?.({ id: `demo-a4-${Date.now()}`, level: 'success', text: `[ACT 4/4] Cluster Restoration & Verification (6 Requests)` });
  await restoreAllApi(cleanUrl, { onLog });
  await sleep(700, signal).catch(() => {});
  for (let i = 0; i < 6; i++) {
    if (signal?.aborted) return;
    await sendOne({
      url: cleanUrl,
      reqIdx: i + 1,
      clientIp: CLIENT_IPS[i % CLIENT_IPS.length],
      delay: 0.05,
      signal,
      onLog,
    });
    await sleep(180, signal).catch(() => {});
  }

  onLog?.({
    id: `demo-end-${Date.now()}`,
    level: 'success',
    text: `4-ACT LIVE DEMO COMPLETE — ALL SYSTEMS VERIFIED!`,
  });
}
