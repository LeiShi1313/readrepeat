'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseAudioUploadOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useAudioUpload(lessonId: string, options: UseAudioUploadOptions = {}) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadAudio = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch(`/api/lessons/${lessonId}/audio`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        if (options.onSuccess) {
          options.onSuccess();
        } else {
          router.refresh();
        }
      } else {
        const data = await response.json();
        const errorMsg = data.error || 'Failed to upload audio';
        setError(errorMsg);
        options.onError?.(errorMsg);
      }
    } catch {
      const errorMsg = 'Failed to upload audio';
      setError(errorMsg);
      options.onError?.(errorMsg);
    } finally {
      setIsUploading(false);
    }
  }, [lessonId, options, router]);

  return { uploadAudio, isUploading, error };
}
