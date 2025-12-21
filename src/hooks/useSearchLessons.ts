'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { LessonWithTags } from '@/lib/db/lessons';

interface UseSearchLessonsOptions {
  initialLessons: LessonWithTags[];
  debounceMs?: number;
}

export function useSearchLessons({
  initialLessons,
  debounceMs = 300,
}: UseSearchLessonsOptions) {
  const [query, setQuery] = useState('');
  const [lessons, setLessons] = useState<LessonWithTags[]>(initialLessons);
  const [isSearching, setIsSearching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback((searchQuery: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // If query is empty, show initial lessons immediately
    if (!searchQuery.trim()) {
      setLessons(initialLessons);
      setIsSearching(false);
      return;
    }

    // Debounce the search
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);

      fetch(`/api/lessons/search?q=${encodeURIComponent(searchQuery)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (!controller.signal.aborted) {
            setLessons(data);
            setIsSearching(false);
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Search failed:', err);
            setIsSearching(false);
          }
        });
    }, debounceMs);
  }, [initialLessons, debounceMs]);

  // Trigger search when query changes
  useEffect(() => {
    search(query);
  }, [query, search]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setLessons(initialLessons);
    setIsSearching(false);
  }, [initialLessons]);

  return {
    query,
    setQuery,
    lessons,
    isSearching,
    clearSearch,
  };
}
