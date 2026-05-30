import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: 'Movilidata OS — Medellín',
        short_name: 'Movilidata',
        start_url: '/',
        display: 'standalone',
        background_color: '#F8FAFC',
        theme_color: '#1F2937',
        description: 'Plataforma unificada de movilidad inteligente para Medellín',
        lang: 'es-CO',
        icons: [
          { src: '/icons/icon-72.svg', sizes: '72x72', type: 'image/svg+xml' },
          { src: '/icons/icon-96.svg', sizes: '96x96', type: 'image/svg+xml' },
          { src: '/icons/icon-144.svg', sizes: '144x144', type: 'image/svg+xml' },
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/(accidents|traffic|weather|alerts|prediction|zonas-riesgo)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'movilidata-api-v1',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5
            }
          },
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'movilidata-tiles-v1',
              expiration: { maxEntries: 200, maxAgeSeconds: 604800 }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.error(`[Proxy] Backend unavailable for ${req.method} ${req.url}: ${err.message}`)
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                detail: 'Backend temporalmente no disponible',
                proxy_error: err.code || 'ECONNREFUSED'
              }))
            }
          })
        },
        timeout: 10000,
        proxyTimeout: 10000
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
          charts: ['recharts'],
          maps: ['leaflet', 'react-leaflet', 'leaflet.heat']
        }
      }
    }
  }
})
