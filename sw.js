// sw.js

// Bumped cache string to v16
const CACHE_NAME = 'omnihub-v16'; 

const ASSETS_TO_CACHE = [
    '/Park-Hub/',
    '/Park-Hub/index.html',
    '/Park-Hub/manifest.json',
    '/Park-Hub/css/global.css',
    '/Park-Hub/css/components.css',
    '/Park-Hub/js/core.js',
    '/Park-Hub/js/stateManager.js',
    '/Park-Hub/js/notifications.js',
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
    
    // Explicit static image declarations
    '/Park-Hub/assets/icon-192.png',
    '/Park-Hub/assets/icon-512.png',

    // External scripts
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
            console.log('SW: Running core asset allocation loops...');
            for (let i = 0; i < ASSETS_TO_CACHE.length; i++) {
                const asset = ASSETS_TO_CACHE[i];
                try {
                    const response = await fetch(asset);
                    if (!response.ok) {
                        console.error(`🚨 SW Cache Load Error: Resource missing -> ${asset} (Status: ${response.status})`);
                    } else {
                        await cache.put(asset, response.clone());
                    }
                } catch (e) {
                    console.error(`🚨 SW Cache Load Error: Network execution blocked on -> ${asset}`, e);
                }
            }
            console.log('SW: Caching complete.');
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
                    return caches.match('/Park-Hub/index.html');
                }
            });
        })
    );
});