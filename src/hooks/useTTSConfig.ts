'use client';

import { useState, useEffect } from 'react';

export interface TTSProvider {
  id: string;
  name: string;
  voices: string[];
  models: string[];
  defaultVoice: string;
  defaultModel: string;
  speakerModes?: string[];
  defaultSpeakerMode?: string;
  defaultDialogVoices?: string[];
}

export function useTTSConfig() {
  const [providers, setProviders] = useState<TTSProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tts/config')
      .then((res) => res.json())
      .then((data) => {
        setProviders(data.providers || []);
      })
      .catch(() => setProviders([]))
      .finally(() => setIsLoading(false));
  }, []);

  return {
    providers,
    ttsAvailable: providers.length > 0,
    isLoading,
  };
}
