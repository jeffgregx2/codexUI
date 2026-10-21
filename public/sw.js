const APP_BASE = new URL(self.registration.scope).pathname
const CACHE_PREFIX = `codexweb-shell:${APP_BASE}:`
const CACHE_NAME = `${CACHE_PREFIX}v3`
const APP_SHELL_PATHS = [APP_BASE, `${APP_BASE}manifest.webmanifest`]
const STATIC_DESTINATIONS = new Set(['document', 'script', 'style', 'image', 'font'])
const BYPASS_PREFIXES = ['codex-api/', 'codex-local-image', 'codex-local-file', 'codex-local-browse/', 'codex-local-edit/'].map((path) => APP_BASE + path)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_PATHS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith(APP_BASE)) return
  if (BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(networkFirstStatic(request))
    return
  }

  if (STATIC_DESTINATIONS.has(request.destination) || url.pathname === `${APP_BASE}manifest.webmanifest`) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(APP_BASE, response.clone())
    return response
  } catch {
    return (await cache.match(APP_BASE)) || Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    return cached
  }

  const response = await networkPromise
  return response || Response.error()
}

async function networkFirstStatic(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
      return response
    }
    return (await cache.match(request)) || response
  } catch {
    return (await cache.match(request)) || Response.error()
  }
}
