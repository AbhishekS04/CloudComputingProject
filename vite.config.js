import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RUST_PROBE_BIN = path.resolve(__dirname, 'backend/health-probe/target/release/bifrost-probe')

const CLUSTER_PROBE_TARGETS = [
  { id: 'lb', url: 'http://20.244.34.101:5000/gateway-health', isLb: true },
  { id: 'server-1', url: 'http://52.172.229.225:5001/health', isLb: false },
  { id: 'server-2', url: 'http://20.193.245.71:5001/health', isLb: false },
  { id: 'server-3', url: 'http://52.172.255.132:5001/health', isLb: false },
]

let cachedProbe = { ts: 0, json: null }
let inFlightProbe = null

function runNodeFallbackProbe() {
  return Promise.all(
    CLUSTER_PROBE_TARGETS.map(async (t) => {
      const start = performance.now()
      const ctrl = new AbortController()
      const tid = setTimeout(() => ctrl.abort(), 1800)
      try {
        const res = await fetch(t.url, { signal: ctrl.signal })
        const body = await res.json().catch(() => ({}))
        const latencyMs = Math.round((performance.now() - start) * 10) / 10
        const paused = Boolean(body?.paused || body?.status === 'paused')
        if (t.isLb) {
          return {
            id: t.id,
            isLb: true,
            online: res.ok,
            paused,
            status: res.ok ? (paused ? 'paused' : 'healthy') : 'unhealthy',
            status_code: res.status,
            latency_ms: latencyMs,
            error: res.ok ? null : `HTTP ${res.status}`,
          }
        }
        return {
          id: t.id,
          isLb: false,
          healthy: res.ok,
          status: res.ok ? 'healthy' : 'unhealthy',
          status_code: res.status,
          latency_ms: latencyMs,
          error: res.ok ? null : `HTTP ${res.status}`,
        }
      } catch (err) {
        const latencyMs = Math.round((performance.now() - start) * 10) / 10
        if (t.isLb) {
          return {
            id: t.id,
            isLb: true,
            online: false,
            paused: false,
            status: 'offline',
            status_code: null,
            latency_ms: latencyMs,
            error: err?.message || 'unreachable',
          }
        }
        return {
          id: t.id,
          isLb: false,
          healthy: false,
          status: 'offline',
          status_code: null,
          latency_ms: latencyMs,
          error: err?.message || 'unreachable',
        }
      } finally {
        clearTimeout(tid)
      }
    })
  ).then((results) => {
    const lb = results.find((r) => r.isLb) || null
    const servers = results.filter((r) => !r.isLb)
    return JSON.stringify({
      source: 'node-probe',
      timestamp_ms: Date.now(),
      lb,
      servers,
    })
  })
}

function getClusterProbeSnapshot() {
  const now = Date.now()
  if (cachedProbe.json && now - cachedProbe.ts < 1500) {
    return Promise.resolve(cachedProbe.json)
  }
  if (inFlightProbe) return inFlightProbe

  const hasRustBin = fs.existsSync(RUST_PROBE_BIN)
  inFlightProbe = (hasRustBin
    ? new Promise((resolve) => {
        execFile(RUST_PROBE_BIN, ['--once', '--timeout-ms', '1800'], { timeout: 3000 }, (err, stdout) => {
          if (!err && stdout && stdout.trim().startsWith('{')) {
            resolve(stdout.trim())
          } else {
            runNodeFallbackProbe().then(resolve)
          }
        })
      })
    : runNodeFallbackProbe()
  ).then((json) => {
    cachedProbe = { ts: Date.now(), json }
    inFlightProbe = null
    return json
  }).catch(() => {
    inFlightProbe = null
    return '{"source":"error","lb":null,"servers":[]}'
  })

  return inFlightProbe
}

function mountBridgeAndProbeMiddlewares(middlewares) {
  const clients = new Set()

  middlewares.use('/__probe/cluster-health', async (req, res) => {
    const json = await getClusterProbeSnapshot()
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(json)
  })

  middlewares.use('/__bridge/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    res.write('data: {"type":"connected"}\n\n')
    clients.add(res)
    req.on('close', () => clients.delete(res))
  })

  middlewares.use('/__bridge/event', (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end('Method Not Allowed')
      return
    }
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      const payload = body.trim() || '{}'
      for (const clientRes of clients) {
        try {
          clientRes.write(`data: ${payload}\n\n`)
        } catch {
          clients.delete(clientRes)
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
    })
  })
}

function noLbTelemetryBridgePlugin() {
  return {
    name: 'no-lb-telemetry-bridge',
    configureServer(server) {
      mountBridgeAndProbeMiddlewares(server.middlewares)
    },
    configurePreviewServer(server) {
      mountBridgeAndProbeMiddlewares(server.middlewares)
    },
  }
}

const PROXY_ROUTES = {
  '/api': {
    target: process.env.VITE_API_BASE_URL || 'http://20.244.34.101:5000',
    changeOrigin: true,
  },
  '/lb-api': {
    target: 'http://20.244.34.101:5000',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/lb-api/, ''),
  },
  '/vm-api/server-1': {
    target: 'http://52.172.229.225:5001',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/vm-api\/server-1/, ''),
  },
  '/vm-api/server-2': {
    target: 'http://20.193.245.71:5001',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/vm-api\/server-2/, ''),
  },
  '/vm-api/server-3': {
    target: 'http://52.172.255.132:5001',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/vm-api\/server-3/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), noLbTelemetryBridgePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@bklitui/ui/charts': path.resolve(__dirname, './src/components/charts/heatmap'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: PROXY_ROUTES,
  },
  preview: {
    proxy: PROXY_ROUTES,
  },
  build: {
    chunkSizeWarningLimit: 2000,
  }
})
