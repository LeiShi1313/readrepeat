'use client';

import { useState, useCallback, useEffect } from 'react';

const AUDIO_CACHE_NAME = 'audio-clips-v1';

interface CacheStatus {
  cached: number;
  total: number;
  isDownloading: boolean;
  urls: Map<string, boolean>;
}

export function useAudioCache(clipUrls: string[]) {
  const [status, setStatus] = useState<CacheStatus>({
    cached: 0,
    total: clipUrls.length,
    isDownloading: false,
    urls: new Map(),
  });

  // Check cache status for all URLs
  const checkCacheStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('caches' in window)) return;

    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const urlMap = new Map<string, boolean>();
      let cachedCount = 0;

      for (const url of clipUrls) {
        const fullUrl = new URL(url, window.location.origin).href;
        const cached = await cache.match(fullUrl);
        const isCached = !!cached;
        urlMap.set(url, isCached);
        if (isCached) cachedCount++;
      }

      setStatus((prev) => ({
        ...prev,
        cached: cachedCount,
        total: clipUrls.length,
        urls: urlMap,
      }));
    } catch (error) {
      console.error('Error checking cache status:', error);
    }
  }, [clipUrls]);

  // Check status on mount and when URLs change
  useEffect(() => {
    checkCacheStatus();
  }, [checkCacheStatus]);

  // Cache a single audio URL
  const cacheAudio = useCallback(async (url: string) => {
    if (typeof window === 'undefined' || !('caches' in window)) return;

    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const fullUrl = new URL(url, window.location.origin).href;

      // Check if already cached
      const existing = await cache.match(fullUrl);
      if (existing) return;

      // Fetch and cache
      const response = await fetch(fullUrl);
      if (response.ok) {
        await cache.put(fullUrl, response);
        setStatus((prev) => {
          const newUrls = new Map(prev.urls);
          newUrls.set(url, true);
          return {
            ...prev,
            cached: prev.cached + 1,
            urls: newUrls,
          };
        });
      }
    } catch (error) {
      console.error('Error caching audio:', error);
    }
  }, []);

  // Cache all audio URLs
  const cacheAllAudio = useCallback(async () => {
    if (typeof window === 'undefined' || !('caches' in window)) return;

    setStatus((prev) => ({ ...prev, isDownloading: true }));

    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      let cachedCount = status.cached;
      const newUrls = new Map(status.urls);

      for (const url of clipUrls) {
        const fullUrl = new URL(url, window.location.origin).href;

        // Check if already cached
        const existing = await cache.match(fullUrl);
        if (existing) {
          newUrls.set(url, true);
          continue;
        }

        // Fetch and cache
        try {
          const response = await fetch(fullUrl);
          if (response.ok) {
            await cache.put(fullUrl, response);
            cachedCount++;
            newUrls.set(url, true);
            setStatus((prev) => ({
              ...prev,
              cached: cachedCount,
              urls: new Map(newUrls),
            }));
          }
        } catch (fetchError) {
          console.error('Error fetching audio:', url, fetchError);
        }
      }
    } catch (error) {
      console.error('Error caching all audio:', error);
    } finally {
      setStatus((prev) => ({ ...prev, isDownloading: false }));
    }
  }, [clipUrls, status.cached, status.urls]);

  // Check if a specific URL is cached
  const isCached = useCallback(
    (url: string) => {
      return status.urls.get(url) ?? false;
    },
    [status.urls]
  );

  return {
    cached: status.cached,
    total: status.total,
    isDownloading: status.isDownloading,
    isAllCached: status.cached === status.total && status.total > 0,
    cacheAudio,
    cacheAllAudio,
    isCached,
    checkCacheStatus,
  };
}
