'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TranscribeButtonProps {
  onTranscribed: (text: string, audioFileId: string) => void;
  whisperModel?: string;
  disabled?: boolean;
}

export function TranscribeButton({ onTranscribed, whisperModel = 'base', disabled }: TranscribeButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer for elapsed time display
  useEffect(() => {
    if (!isTranscribing) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTranscribing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    setIsTranscribing(true);
    setError(null);

    try {
      // Upload audio and create transcription job
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('whisperModel', whisperModel);

      const uploadRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || 'Failed to upload audio');
      }

      const { jobId, audioFileId } = await uploadRes.json();

      // Poll for result
      const result = await pollForResult(jobId);
      onTranscribed(result.text, audioFileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  const pollForResult = async (jobId: string): Promise<{ text: string }> => {
    // Poll indefinitely until job completes or fails
    // Large models on CPU can take several minutes for long audio
    while (true) {
      const res = await fetch(`/api/transcribe/${jobId}`);
      if (!res.ok) {
        throw new Error('Failed to check transcription status');
      }

      const data = await res.json();

      if (data.status === 'COMPLETED') {
        return { text: data.text };
      }

      if (data.status === 'FAILED') {
        throw new Error(data.error || 'Transcription failed');
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  return (
    <div className="inline-flex items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isTranscribing}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isTranscribing}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors',
          disabled || isTranscribing
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
        )}
        title="Upload audio to transcribe"
      >
        {isTranscribing ? (
          <>
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Transcribing... {formatTime(elapsedSeconds)}
          </>
        ) : (
          <>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Transcribe Audio
          </>
        )}
      </button>
      {error && (
        <span className="ml-2 text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}
