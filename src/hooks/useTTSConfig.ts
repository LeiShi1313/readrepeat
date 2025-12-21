'use client';

import { useState, useEffect } from 'react';

export function useTTSConfig() {
  const [ttsAvailable, setTtsAvailable] = useState(false);

  useEffect(() => {
    fetch('/api/tts/config')
      .then((res) => res.json())
      .then((data) => {
        setTtsAvailable((data.providers?.length || 0) > 0);
      })
      .catch(() => setTtsAvailable(false));
  }, []);

  return { ttsAvailable };
}
