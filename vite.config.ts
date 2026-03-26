import { defineConfig } from 'vite'
import path from 'node:path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

function bdocProxy() {
  return {
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/__bdoc_proxy', async (req, res) => {
        const requestUrl = new URL(req.url ?? '', 'http://localhost')
        const target = requestUrl.searchParams.get('url')

        if (!target) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing "url" query parameter.' }))
          return
        }

        try {
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (!value || key === 'host' || key === 'origin' || key === 'content-length') {
              continue
            }

            headers.set(key, Array.isArray(value) ? value.join(', ') : value)
          }

          const method = req.method ?? 'GET'
          const body =
            method === 'GET' || method === 'HEAD'
              ? undefined
              : await new Promise<Buffer>((resolve, reject) => {
                  const chunks: Buffer[] = []
                  req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
                  req.on('end', () => resolve(Buffer.concat(chunks)))
                  req.on('error', reject)
                })

          const upstream = await fetch(target, {
            method,
            headers,
            body,
            redirect: 'follow',
          })

          res.statusCode = upstream.status
          upstream.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'content-encoding') {
              return
            }
            res.setHeader(key, value)
          })
          res.setHeader('Access-Control-Allow-Origin', '*')

          const responseBuffer = Buffer.from(await upstream.arrayBuffer())
          res.end(responseBuffer)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Proxy request failed.',
            }),
          )
        }
      })
    },
    name: 'bdoc-proxy',
  }
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    bdocProxy(),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
