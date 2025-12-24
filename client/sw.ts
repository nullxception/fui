/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
self.skipWaiting();

// Bun HMR bypass
registerRoute(({ url }) => url.pathname.startsWith("/_bun"), new NetworkOnly());

// Cacheable RPC calls
registerRoute(
  ({ url }) => /^\/rpc\/(info\.|images\.by)/.test(url.pathname),
  new NetworkFirst({ cacheName: "rpc" }),
);

// Bundled CSS and JS
registerRoute(
  ({ request }) => ["script", "style"].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: "static-resources" }),
);

// Images (Icons, user uploads, output images) and fonts
registerRoute(
  ({ request }) => ["image", "font"].includes(request.destination),
  new CacheFirst({ cacheName: "assets" }),
);

// SPA routing
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({ cacheName: "pages" }),
);
