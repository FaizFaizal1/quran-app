const CACHE_NAME = 'quran-loop-v5';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './logic.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install Event: Cache App Shell
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();

    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all: app shell and content');
            return cache.addAll(ASSETS);
        })
    );
});

// Fetch Event: Serve from Cache, loose fallback to Network
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((r) => {
            // console.log('[Service Worker] Fetching resource: ' + e.request.url);
            return r || fetch(e.request).then((response) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    if (e.request.url.startsWith('http') && !e.request.url.includes('api.quran.com') && !e.request.url.includes('everyayah.com')) {
                        cache.put(e.request, response.clone());
                    }
                    return response;
                });
            });
        })
    );
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Activate');
    // Claim any clients immediately, so the new service worker takes control
    e.waitUntil(clients.claim());

    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});
