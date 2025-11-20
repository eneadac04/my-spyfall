self.addEventListener('install', (event) => {
  console.log('Service Worker installato');
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Non facciamo nulla di speciale, ma Chrome è contento che questo esista.
});