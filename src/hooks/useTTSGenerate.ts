'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface TTSGenerateParams {
  provider: string;
  voiceName: string;
  model: string;
  voice2Name?: string;
}

interface UseTTSGenerateOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useTTSGenerate(lessonId: string, options: UseTTSGenerateOptions = {}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: TTSGenerateParams) => {
    if (!lessonId || !params.voiceName) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/lessons/${lessonId}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate audio');
      }

      if (options.onSuccess) {
        options.onSuccess();
      } else {
        router.push(`/lesson/${lessonId}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      options.onError?.(errorMsg);
      setIsGenerating(false);
    }
  }, [lessonId, options, router]);

  return { generate, isGenerating, error };
}
