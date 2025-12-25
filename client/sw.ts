/// <reference lib="webworker" />
import { clientsClaim, type WorkboxPlugin } from "workbox-core";
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

const ensureNetworkOk: WorkboxPlugin = {
  fetchDidSucceed: async ({ response }) => {
    if (!response || !response.ok) {
      throw new Error("Bad response");
    }
    return response;
  },
};

// Bun HMR bypass
registerRoute(({ url }) => url.pathname.startsWith("/_bun"), new NetworkOnly());

// Cacheable RPC calls
registerRoute(
  ({ url }) => /^\/rpc\/(info\.|images\.by|.*\.get$)/.test(url.pathname),
  new NetworkFirst({
    cacheName: "rpc",
    networkTimeoutSeconds: 3,
    plugins: [ensureNetworkOk],
  }),
);

// Bundled CSS and JS
registerRoute(
  ({ request }) => ["script", "style"].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: "static-resources",
    plugins: [ensureNetworkOk],
  }),
);

// Images (Icons, user uploads, output images) and fonts
registerRoute(
  ({ request }) => ["image", "font"].includes(request.destination),
  new CacheFirst({ cacheName: "assets", plugins: [ensureNetworkOk] }),
);

// SPA routing
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages",
    networkTimeoutSeconds: 3,
    plugins: [ensureNetworkOk],
  }),
);
