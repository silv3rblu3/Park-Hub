const CACHE_NAME = 'omnihub-v11';

const BASE_PATH = '/Park-Hub';

const ASSETS_TO_CACHE = [
`${BASE_PATH}/`,
`${BASE_PATH}/index.html`,
`${BASE_PATH}/manifest.json`,

```
`${BASE_PATH}/css/global.css`,
`${BASE_PATH}/css/components.css`,

`${BASE_PATH}/js/core.js`,
`${BASE_PATH}/js/stateManager.js`,
`${BASE_PATH}/js/notifications.js`,

`${BASE_PATH}/apps/inventory/template.js`,
`${BASE_PATH}/apps/inventory/app.js`,

`${BASE_PATH}/apps/fleet/template.js`,
`${BASE_PATH}/apps/fleet/app.js`,

`${BASE_PATH}/apps/winterization/template.js`,
`${BASE_PATH}/apps/winterization/app.js`,

`${BASE_PATH}/apps/first-aid/template.js`,
`${BASE_PATH}/apps/first-aid/app.js`,

`${BASE_PATH}/apps/parts/template.js`,
`${BASE_PATH}/apps/parts/app.js`,

`${BASE_PATH}/assets/icon-192.png`,
`${BASE_PATH}/assets/icon-512.png`,

'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',
'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js',
'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
```

];

self.addEventListener('install', (event) => {
self.skipWaiting();

```
event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
        console.log('SW: Caching app shell...');
        return cache.addAll(ASSETS_TO_CACHE);
    })
);
```

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
if (event.request.method !== 'GET') return;

```
event.respondWith(
    caches.match(event.request).then((cachedResponse) => {

        if (cachedResponse) {
            return cachedResponse;
        }

        return fetch(event.request)
            .then((networkResponse) => {
                return networkResponse;
            })
            .catch(() => {

                if (event.request.mode === 'navigate') {
                    return caches.match(`${BASE_PATH}/index.html`);
                }

            });
    })
);
```

});
