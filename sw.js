// sw.js

// Version bumped to v10 to force the mobile cache reset
const CACHE_NAME = 'omnihub-v10'; 

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
    
    // Explicit PNG targets
    './assets/icon-192.png',
    './assets/icon-512.png',

    // Libraries - Replaced unpkg with cdnjs to avoid redirect 404s, added excel/filesaver
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('SW: Starting asset caching...');
            for (let i = 0; i < ASSETS_TO_CACHE.length; i++) {
                const asset = ASSETS_TO_CACHE[i];
                try {
                    const response = await fetch(asset);
                    if (!response.ok) {
                        console.error(`🚨 SW Install Error: File not found -> ${asset} (Status: ${response.status})`);
                    } else {
                        await cache.put(asset, response.clone());
                    }
                } catch (e) {
                    console.error(`🚨 SW Install Error: Network fail on -> ${asset}`, e);
                }
            }
            console.log('SW: Caching complete. App should now install.');
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
        }).then(() => {
            return self.clients.claim(); 
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; 
            }
            
            return fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});