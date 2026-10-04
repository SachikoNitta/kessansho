// オフラインでも遊べるよう、アプリ本体と同梱ケースをすべてキャッシュする。
// ケースはアプリに同梱し、アップデートで更新する。リリースのビルドが CACHE に版を書き込む。
// ASSETS の漏れは tests/offline.test.js が検出する。
const CACHE = "kessansho-v3";
const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "icons/icon.svg",
  "src/main.js",
  "src/version.js",
  "src/core/contracts.js",
  "src/core/conditions.js",
  "src/core/session.js",
  "src/core/progress.js",
  "src/core/preferences.js",
  "src/core/validate.js",
  "src/authoring/case-builder.js",
  "src/adapters/local-storage-store.js",
  "src/adapters/memory-store.js",
  "src/adapters/bundled-case-repository.js",
  "src/ui/app.js",
  "src/ui/charts.js",
  "src/ui/dom.js",
  "src/ui/decorations.js",
  "src/ui/doc-renderers.js",
  "src/ui/illustrations.js",
  "src/ui/sheet.js",
  "src/ui/sheets.js",
  "src/ui/stock-chart.js",
  "src/ui/screens/cover.js",
  "src/ui/screens/cases.js",
  "src/ui/screens/scene-views.js",
  "cases/catalog.js",
  "cases/nulog/case.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ネットワーク優先、失敗したらキャッシュ。
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
