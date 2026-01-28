const CACHE_NAME = 'lost-found-v1'
const API_CACHE = 'api-cache-v1'

const STATIC_ASSETS = [
  '/',
  '/browse',
  '/login',
  '/register',
  '/placeholder.svg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Cache API responses for 5 minutes
  if (url.pathname.startsWith('/api/items')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request)
        
        if (cachedResponse) {
          const cacheTime = new Date(cachedResponse.headers.get('date'))
          const now = new Date()
          const fiveMinutes = 5 * 60 * 1000
          
          if (now - cacheTime < fiveMinutes) {
            return cachedResponse
          }
        }
        
        try {
          const response = await fetch(request)
          if (response.ok) {
            cache.put(request, response.clone())
          }
          return response
        } catch {
          return cachedResponse || new Response('Offline', { status: 503 })
        }
      })
    )
  }
  
  // Cache static assets
  else if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request))
    )
  }
})