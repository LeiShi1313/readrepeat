'use client';

import { useCallback, useState } from 'react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { cn } from '@/lib/utils';
import { WaveformComparison } from '@/components/editor/WaveformComparison';

interface RecordButtonProps {
  sentenceId: string;
  hasRecording: boolean;
  isPlayingRecording?: boolean;
  onRecordingComplete: (sentenceId: string, recordingId: string) => void;
  onRecordingDelete: (sentenceId: string) => void;
  onPlayRecording?: (sentenceId: string) => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function RecordButton({
  sentenceId,
  hasRecording,
  isPlayingRecording = false,
  onRecordingComplete,
  onRecordingDelete,
  onPlayRecording,
}: RecordButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const handleRecordingComplete = useCallback(async (blob: Blob, durationMs: number) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('durationMs', String(durationMs));

      const response = await fetch(`/api/recordings/${sentenceId}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        onRecordingComplete(sentenceId, data.id);
      }
    } catch (error) {
      console.error('Failed to upload recording:', error);
    } finally {
      setIsUploading(false);
      reset();
    }
  }, [sentenceId, onRecordingComplete]);

  const {
    isRecording,
    isSaving,
    durationMs,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  } = useVoiceRecorder({
    onRecordingComplete: handleRecordingComplete,
  });

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/recordings/${sentenceId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onRecordingDelete(sentenceId);
        setShowDelete(false);
      }
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  }, [sentenceId, onRecordingDelete]);

  // Recording in progress
  if (isRecording) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Recording timer */}
        <span className="text-xs text-red-500 font-mono tabular-nums min-w-[36px]">
          {formatDuration(durationMs)}
        </span>

        {/* Recording indicator */}
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />

        {/* Stop button */}
        <button
          onClick={stopRecording}
          className="p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          title="Stop recording"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>

        {/* Cancel button */}
        <button
          onClick={cancelRecording}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Cancel"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  // Saving/uploading
  if (isSaving || isUploading) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-gray-400">Saving...</span>
        <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-red-500">{error}</span>
        <button
          onClick={reset}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Has recording - show play button, compare, re-record, and delete
  if (hasRecording) {
    return (
      <>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {showDelete ? (
            <>
              <button
                onClick={handleDelete}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDelete(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {/* Play recording button */}
              {onPlayRecording && (
                <button
                  onClick={() => onPlayRecording(sentenceId)}
                  className={cn(
                    'p-1.5 rounded-full transition-colors',
                    isPlayingRecording
                      ? 'bg-green-500 text-white'
                      : 'hover:bg-green-50 text-green-600 hover:text-green-700'
                  )}
                  title="Play my recording"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}

              {/* Compare waveforms button */}
              <button
                onClick={() => setShowComparison(true)}
                className="p-1.5 rounded-full hover:bg-purple-50 text-purple-500 hover:text-purple-600 transition-colors"
                title="Compare waveforms"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </button>

              {/* Re-record button */}
              <button
                onClick={startRecording}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Re-record"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>

              {/* Delete toggle */}
              <button
                onClick={() => setShowDelete(true)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors"
                title="Delete recording"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Waveform comparison modal */}
        {showComparison && (
          <WaveformComparison
            originalUrl={`/api/media/sentences/${sentenceId}/clip`}
            recordingUrl={`/api/media/recordings/${sentenceId}`}
            sentenceId={sentenceId}
            onClose={() => setShowComparison(false)}
            onRecordingComplete={onRecordingComplete}
          />
        )}
      </>
    );
  }

  // Default - show record button
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        startRecording();
      }}
      className={cn(
        'p-1.5 rounded-full hover:bg-gray-100 transition-colors',
        'text-gray-300 hover:text-gray-500'
      )}
      title="Record your voice"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    </button>
  );
}
