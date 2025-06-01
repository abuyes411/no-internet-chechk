const CACHE_NAME = 'my-offline-app-cache-v1';
const urlsToCache = [
    '/', // Cache the root URL (index.html)
    '/index.html',
    '/offline.html',
    // Add paths to your CSS, JavaScript, and images if you have any
    // e.g., '/styles.css', '/app.js', '/images/logo.png'
];

self.addEventListener('install', (event) => {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .catch(() => {
                        // If network request fails, serve the offline page
                        return caches.match('/offline.html');
                    });
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
