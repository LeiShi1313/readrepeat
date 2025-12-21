'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseLessonDeleteOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  redirectTo?: string;
}

export function useLessonDelete(lessonId: string, options: UseLessonDeleteOptions = {}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteLesson = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (options.onSuccess) {
          options.onSuccess();
        } else if (options.redirectTo) {
          router.push(options.redirectTo);
        } else {
          router.push('/');
        }
      } else {
        const data = await response.json();
        const errorMsg = data.error || 'Failed to delete lesson';
        setError(errorMsg);
        options.onError?.(errorMsg);
      }
    } catch {
      const errorMsg = 'Failed to delete lesson';
      setError(errorMsg);
      options.onError?.(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  }, [lessonId, options, router]);

  return { deleteLesson, isDeleting, error };
}
