// Série Válida — service worker.
// Com internet: busca a versão mais nova do app (e guarda uma cópia).
// Sem internet (academia sem sinal): abre a cópia guardada.
// A planilha, os PDFs importados e os registros ficam no IndexedDB do navegador, não aqui.
const CACHE = "sv-shell-v3";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg", "./icon-192.png",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isPage = req.mode === "navigate" || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname));
  if (isPage) {
    // rede primeiro: atualizações aparecem na próxima abertura
    e.respondWith(fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); } return res; })
      .catch(() => caches.match("./index.html").then(r => r || caches.match("./"))));
    return;
  }
  // demais arquivos: cópia guardada primeiro, atualiza em segundo plano
  e.respondWith(caches.match(req).then(cached => {
    const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => cached);
    return cached || net;
  }));
});
