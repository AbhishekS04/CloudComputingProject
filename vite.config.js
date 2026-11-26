import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function noLbTelemetryBridgePlugin() {
  const clients = new Set()
  return {
    name: 'no-lb-telemetry-bridge',
    configureServer(server) {
      server.middlewares.use('/__bridge/stream', (req, res) => {
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

      server.middlewares.use('/__bridge/event', (req, res) => {
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
