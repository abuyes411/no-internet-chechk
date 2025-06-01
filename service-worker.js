// service-worker.js

// Define the name of your cache and the version.
// Increment the version number (e.g., v2, v3) whenever you make changes
// to your cached assets (like offline.html or CSS/JS files) to ensure
// users get the latest version.
const CACHE_NAME = 'my-quiz-app-cache-v1';

// Define the URL of your custom offline page.
// This path must be relative to the service worker's scope (which is '/' in your case).
const OFFLINE_URL = '/offline.html';

// Define assets that should ALWAYS be pre-cached to ensure basic functionality offline.
// This should include your offline page, logo, icon, and possibly critical CSS/JS.
const urlsToCache = [
  OFFLINE_URL,
  '/logo.png',
  '/icon.png',
  // You might want to cache these critical external resources too,
  // but be mindful of their caching headers and potential updates.
  // For simplicity, you might rely on the browser's regular cache for these
  // unless you specifically need them for your *offline* experience.
  // 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  // 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  // 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  // 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// --- Install Event ---
// This event fires when the Service Worker is first installed.
// We use it to pre-cache our essential assets, like the offline page.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event triggered.');
  event.waitUntil(
    caches.open(CACHE_NAME) // Open the cache with our defined name
      .then((cache) => {
        console.log('Service Worker: Caching essential assets...');
        return cache.addAll(urlsToCache) // Add all URLs in urlsToCache to the cache
          .catch(error => {
            console.error('Service Worker: Failed to cache some assets:', error);
            // Even if some fail, try to proceed if OFFLINE_URL was crucial.
          });
      })
      .then(() => self.skipWaiting()) // Force the waiting service worker to become active
  );
});

// --- Activate Event ---
// This event fires when the Service Worker becomes active.
// We use it to clean up old caches (from previous versions of your SW).
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event triggered.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName); // Delete old caches
          }
        })
      );
    }).then(() => self.clients.claim()) // Makes the current service worker control all clients immediately
  );
});

// --- Fetch Event ---
// This event fires for every network request made by the controlled pages.
// This is where the magic happens: intercepting requests and serving cached content.
self.addEventListener('fetch', (event) => {
  // Respond to requests with our custom logic
  event.respondWith(
    // Try to fetch the resource from the network first
    fetch(event.request)
      .then(response => {
        // If the network request is successful, clone the response and cache it
        // so it's available for future offline use.
        // We only cache GET requests.
        if (response.ok && event.request.method === 'GET') {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse);
          });
        }
        return response; // Return the network response
      })
      .catch(() => {
        // If the network request fails (e.g., no internet, server error)
        console.log('Service Worker: Network fetch failed, trying cache.');

        // Check if the request is for a navigation (i.e., a new page load)
        if (event.request.mode === 'navigate') {
          console.log('Service Worker: Navigational request failed, serving offline page.');
          return caches.match(OFFLINE_URL); // Serve your custom offline page
        }

        // For other types of requests (e.g., images, CSS, JS),
        // try to serve them from the cache if available.
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('Service Worker: Serving asset from cache:', event.request.url);
            return cachedResponse;
          }
          // If neither network nor cache has the resource,
          // for non-navigation requests, you might return a generic fallback
          // or nothing, which will result in a browser error for that specific asset.
          // For crucial assets, you might want a placeholder or more specific offline message.
          console.log('Service Worker: Neither network nor cache has:', event.request.url);
          return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
        });
      })
  );
});
