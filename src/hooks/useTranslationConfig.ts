'use client';

import { useState, useEffect, useCallback } from 'react';

interface TranslationProvider {
  id: string;
  name: string;
}

interface UseTranslationConfigOptions {
  sourceLang: string;
  targetLang: string;
  onTranslated?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useTranslationConfig({
  sourceLang,
  targetLang,
  onTranslated,
  onError,
}: UseTranslationConfigOptions) {
  const [providers, setProviders] = useState<TranslationProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    fetch('/api/translate/config')
      .then((res) => res.json())
      .then((data) => {
        setProviders(data.providers || []);
        if (data.providers?.length > 0) {
          setSelectedProvider(data.providers[0].id);
        }
      })
      .catch(() => setProviders([]));
  }, []);

  const translate = useCallback(
    async (text: string) => {
      if (!text.trim() || !selectedProvider) return;

      setIsTranslating(true);

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            sourceLang,
            targetLang,
            provider: selectedProvider,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Translation failed');
        }

        const data = await res.json();
        onTranslated?.(data.translatedText);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Translation failed');
      } finally {
        setIsTranslating(false);
      }
    },
    [sourceLang, targetLang, selectedProvider, onTranslated, onError]
  );

  return {
    providers,
    selectedProvider,
    setSelectedProvider,
    isTranslating,
    translate,
  };
}
