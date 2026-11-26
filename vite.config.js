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
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
  }
})
