/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const AUDIO_CACHE_NAME = "audio-clips-v1";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Cache audio clips with cache-first strategy
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/media/sentences/") && url.pathname.endsWith("/clip"),
      handler: async ({ request, event }) => {
        const cache = await caches.open(AUDIO_CACHE_NAME);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            // Clone and cache the response
            event.waitUntil(cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        } catch (error) {
          // If offline and not cached, return error
          return new Response("Audio not available offline", { status: 503 });
        }
      },
    },
    // Default caching for other routes
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Listen for messages from the client
self.addEventListener("message", async (event) => {
  if (event.data && event.data.type === "CACHE_AUDIO") {
    const { url } = event.data;
    const cache = await caches.open(AUDIO_CACHE_NAME);

    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        event.ports[0]?.postMessage({ success: true });
      } else {
        event.ports[0]?.postMessage({ success: false, error: "Failed to fetch" });
      }
    } catch (error) {
      event.ports[0]?.postMessage({ success: false, error: String(error) });
    }
  }

  if (event.data && event.data.type === "CHECK_CACHE") {
    const { urls } = event.data;
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const results: Record<string, boolean> = {};

    for (const url of urls) {
      const cached = await cache.match(url);
      results[url] = !!cached;
    }

    event.ports[0]?.postMessage({ results });
  }

  if (event.data && event.data.type === "CACHE_ALL_AUDIO") {
    const { urls } = event.data;
    const cache = await caches.open(AUDIO_CACHE_NAME);
    let cached = 0;

    for (const url of urls) {
      try {
        // Check if already cached
        const existing = await cache.match(url);
        if (existing) {
          cached++;
          event.ports[0]?.postMessage({ type: "progress", cached, total: urls.length });
          continue;
        }

        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          cached++;
        }
        event.ports[0]?.postMessage({ type: "progress", cached, total: urls.length });
      } catch (error) {
        // Continue with other URLs even if one fails
        console.error("Failed to cache:", url, error);
      }
    }

    event.ports[0]?.postMessage({ type: "complete", cached, total: urls.length });
  }
});
