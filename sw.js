// sw.js

const CACHE_NAME = 'omnihub-v20'; // Bumped version for new Roster app

const ASSETS_TO_CACHE = [
    '/Park-Hub/',
    '/Park-Hub/index.html',
    '/Park-Hub/manifest.json',
    '/Park-Hub/css/global.css',
    '/Park-Hub/css/components.css',
    '/Park-Hub/js/core.js',
    '/Park-Hub/js/stateManager.js',
    '/Park-Hub/js/notifications.js',
    '/Park-Hub/apps/roster/template.js',
    '/Park-Hub/apps/roster/app.js',
    '/Park-Hub/apps/park-info/template.js',
    '/Park-Hub/apps/park-info/app.js',
    '/Park-Hub/apps/inventory/template.js',
    '/Park-Hub/apps/inventory/app.js',
    '/Park-Hub/apps/fleet/template.js',
    '/Park-Hub/apps/fleet/app.js',
    '/Park-Hub/apps/winterization/template.js',
    '/Park-Hub/apps/winterization/app.js',
    '/Park-Hub/apps/first-aid/template.js',
    '/Park-Hub/apps/first-aid/app.js',
    '/Park-Hub/apps/parts/template.js',
    '/Park-Hub/apps/parts/app.js',
    '/Park-Hub/apps/projects/template.js',
    '/Park-Hub/apps/projects/app.js',
    '/Park-Hub/assets/icon-192.png',
    '/Park-Hub/assets/icon-512.png',
    '/Park-Hub/js/papaparse.min.js',
    '/Park-Hub/js/html5-qrcode.min.js',
    '/Park-Hub/js/exceljs.min.js',
    '/Park-Hub/js/FileSaver.min.js',
    '/Park-Hub/js/qrcode.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn("SW Install: Some assets failed to cache initially, but proceeding.", err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only intercept basic GET requests
    if (event.request.method !== 'GET') return;

    // Stale-While-Revalidate Strategy
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            
            // Fire off a network request to update the cache in the background
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Ensure we only cache valid, complete responses (not opaque errors)
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Offline fallback route: if completely isolated, force a hard redirect to the app shell
                if (event.request.mode === 'navigate') {
                    return caches.match('/Park-Hub/index.html');
                }
            });

            // Immediately return the ultra-fast cached response if it exists, otherwise wait for the network
            return cachedResponse || fetchPromise;
        })
    );
});