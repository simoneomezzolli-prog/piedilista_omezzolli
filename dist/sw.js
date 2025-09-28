const CACHE_NAME = "piedilista-v8";
self.addEventListener("install", e => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  e.respondWith(caches.open(CACHE_NAME).then(async cache => {
    try {
      const res = await fetch(e.request);
      if (e.request.method==="GET" && res.ok) cache.put(e.request,res.clone());
      return res;
    } catch {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      if (e.request.mode==="navigate") return cache.match("/")||new Response("Offline",{status:503});
      return new Response("Offline",{status:503});
    }
  }));
});