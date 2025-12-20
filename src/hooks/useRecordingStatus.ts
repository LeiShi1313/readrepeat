'use client';

import { useState, useEffect, useCallback } from 'react';

interface RecordingInfo {
  id: string;
  durationMs: number | null;
}

export function useRecordingStatus(sentenceIds: string[]) {
  const [recordings, setRecordings] = useState<Map<string, RecordingInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recording status for all sentences
  useEffect(() => {
    if (sentenceIds.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchRecordings = async () => {
      setIsLoading(true);
      const newRecordings = new Map<string, RecordingInfo>();

      // Fetch in parallel
      const results = await Promise.all(
        sentenceIds.map(async (sentenceId) => {
          try {
            const response = await fetch(`/api/recordings/${sentenceId}`);
            const data = await response.json();
            return { sentenceId, data };
          } catch {
            return { sentenceId, data: { exists: false } };
          }
        })
      );

      for (const { sentenceId, data } of results) {
        if (data.exists) {
          newRecordings.set(sentenceId, {
            id: data.id,
            durationMs: data.durationMs,
          });
        }
      }

      setRecordings(newRecordings);
      setIsLoading(false);
    };

    fetchRecordings();
  }, [sentenceIds]);

  const hasRecording = useCallback((sentenceId: string) => {
    return recordings.has(sentenceId);
  }, [recordings]);

  const getRecordingInfo = useCallback((sentenceId: string) => {
    return recordings.get(sentenceId) || null;
  }, [recordings]);

  const markRecordingAdded = useCallback((sentenceId: string, id: string, durationMs: number | null) => {
    setRecordings(prev => {
      const next = new Map(prev);
      next.set(sentenceId, { id, durationMs });
      return next;
    });
  }, []);

  const markRecordingRemoved = useCallback((sentenceId: string) => {
    setRecordings(prev => {
      const next = new Map(prev);
      next.delete(sentenceId);
      return next;
    });
  }, []);

  return {
    recordings,
    isLoading,
    hasRecording,
    getRecordingInfo,
    markRecordingAdded,
    markRecordingRemoved,
  };
}
