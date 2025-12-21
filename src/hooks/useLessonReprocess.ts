'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseLessonReprocessOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useLessonReprocess(lessonId: string, options: UseLessonReprocessOptions = {}) {
  const router = useRouter();
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reprocess = useCallback(async () => {
    setIsReprocessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/lessons/${lessonId}/reprocess`, {
        method: 'POST',
      });

      if (response.ok) {
        if (options.onSuccess) {
          options.onSuccess();
        } else {
          router.refresh();
        }
      } else {
        const data = await response.json();
        const errorMsg = data.error || 'Failed to reprocess lesson';
        setError(errorMsg);
        options.onError?.(errorMsg);
      }
    } catch {
      const errorMsg = 'Failed to reprocess lesson';
      setError(errorMsg);
      options.onError?.(errorMsg);
    } finally {
      setIsReprocessing(false);
    }
  }, [lessonId, options, router]);

  return { reprocess, isReprocessing, error };
}
