// sw.js

const CACHE_NAME = 'omnihub-v4'; // Bumped to v4 to wipe the old cache

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/global.css',
    './css/components.css',
    './js/core.js',
    './js/stateManager.js',
    './js/notifications.js',
    './apps/inventory/template.js',
    './apps/inventory/app.js',
    './apps/fleet/template.js',
    './apps/fleet/app.js',
    './apps/winterization/template.js',
    './apps/winterization/app.js',
    './apps/first-aid/template.js',
    './apps/first-aid/app.js',
    './apps/parts/template.js',
    './apps/parts/app.js',
    
    // Icons
    './assets/icon-192.png',
    './assets/icon-512.png',

    // Libraries
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
    'https://unpkg.com/html5-qrcode',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the new service worker to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
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
        })
    );
});

// UPGRADED FETCH HANDLER: Catches navigation failures on GitHub Pages
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response; // Return exact cached match
            }
            
            // If it's a page navigation request that wasn't perfectly matched, 
            // forcefully serve the cached index.html
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
            
            // Otherwise attempt network fetch
            return fetch(event.request);
        })
    );
});