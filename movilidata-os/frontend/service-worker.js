const CACHE_NAME = 'movilidata-v1'
const API_CACHE = 'movilidata-api-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72.svg',
  '/icons/icon-96.svg',
  '/icons/icon-144.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
]
const API_ENDPOINTS = [
  '/api/accidents',
  '/api/traffic',
  '/api/weather',
  '/api/alerts',
  '/api/alerts/history',
  '/api/prediction',
  '/api/zonas-riesgo',
  '/api/safe-route',
  '/api/export/accidents',
  '/api/export/traffic',
  '/api/export/alerts',
  '/api/assistant',
  '/api/scrape',
  '/api/health'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // API requests: Network First with fallback to cache
  if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    event.respondWith(networkFirstWithCache(request, API_CACHE))
    return
  }

  // Static assets: Cache First
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      return caches.open(CACHE_NAME).then(cache => {
        cache.put(request, response.clone())
        return response
      })
    }))
  )
})

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request)
    const clone = response.clone()
    caches.open(cacheName).then(cache => cache.put(request, clone))
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) {
      return new Response(cached.body, {
        ...cached,
        headers: new Headers({ ...cached.headers, 'X-Cache-Status': 'HIT' })
      })
    }
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Sin conexión. Últimos datos en caché.' }),
      { status: 503, headers: { 'Content-Type': 'application/json', 'X-Cache-Status': 'MISS' } }
    )
  }
}
