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
      .then((cache) => {
        // Only cache assets that exist, skip failures
        return Promise.allSettled(
          STATIC_ASSETS.map(asset => cache.add(asset))
        )
      })
      .catch(() => {}) // Silently fail if caching fails
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and external APIs
  if (request.method !== 'GET') {
    return
  }

  // Cache API responses for 5 minutes
  if (url.pathname.startsWith('/api/items')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request)
          if (response.ok) {
            cache.put(request, response.clone())
          }
          return response
        } catch (error) {
          // Return cached response if fetch fails
          const cachedResponse = await cache.match(request)
          return cachedResponse || new Response('Offline', { status: 503 })
        }
      }).catch(() => {
        // If cache fails, just fetch
        return fetch(request).catch(() => new Response('Offline', { status: 503 }))
      })
    )
  }
  // Cache static assets
  else if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request))
        .catch(() => new Response('Offline', { status: 503 }))
    )
  }
})

// Push Notification Handling
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new message',
      icon: data.icon || '/placeholder-logo.png',
      badge: '/placeholder-logo.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'MCC Lost & Found', options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});