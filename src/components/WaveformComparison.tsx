'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface WaveformComparisonProps {
  originalUrl: string;
  recordingUrl: string;
  sentenceId: string;
  onClose: () => void;
  onRecordingComplete: (sentenceId: string, recordingId: string) => void;
}

export function WaveformComparison({
  originalUrl,
  recordingUrl,
  sentenceId,
  onClose,
  onRecordingComplete,
}: WaveformComparisonProps) {
  const originalContainerRef = useRef<HTMLDivElement>(null);
  const recordingContainerRef = useRef<HTMLDivElement>(null);
  const originalWsRef = useRef<WaveSurfer | null>(null);
  const recordingWsRef = useRef<WaveSurfer | null>(null);

  // Suppress AbortError from WaveSurfer during unmount
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'AbortError') {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  const [isOriginalReady, setIsOriginalReady] = useState(false);
  const [isRecordingReady, setIsRecordingReady] = useState(false);
  const [isOriginalPlaying, setIsOriginalPlaying] = useState(false);
  const [isRecordingPlaying, setIsRecordingPlaying] = useState(false);
  const [originalSpeed, setOriginalSpeed] = useState(1);
  const [recordingSpeed, setRecordingSpeed] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingVersion, setRecordingVersion] = useState(0);

  const handleRecordingDone = useCallback(async (blob: Blob, durationMs: number) => {
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
        // Trigger reload of recording waveform
        setRecordingVersion(v => v + 1);
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
    error: recordError,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  } = useVoiceRecorder({
    onRecordingComplete: handleRecordingDone,
  });

  const adjustSpeed = (current: number, delta: number) => {
    const newSpeed = Math.round((current + delta) * 10) / 10;
    return Math.max(0.5, Math.min(2, newSpeed));
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize WaveSurfer instances
  useEffect(() => {
    if (!originalContainerRef.current || !recordingContainerRef.current) return;

    // Clear any existing waveforms from containers
    originalContainerRef.current.innerHTML = '';
    recordingContainerRef.current.innerHTML = '';

    // Create original waveform (blue)
    const originalWs = WaveSurfer.create({
      container: originalContainerRef.current,
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      cursorColor: '#1e40af',
      cursorWidth: 1,
      height: 80,
      normalize: true,
      minPxPerSec: 50,
    });
    originalWsRef.current = originalWs;

    // Create recording waveform (green)
    const recordingWs = WaveSurfer.create({
      container: recordingContainerRef.current,
      waveColor: '#22c55e',
      progressColor: '#16a34a',
      cursorColor: '#15803d',
      cursorWidth: 1,
      height: 80,
      normalize: true,
      minPxPerSec: 50,
    });
    recordingWsRef.current = recordingWs;

    // Load audio (add cache-busting for recordings)
    originalWs.load(originalUrl);
    recordingWs.load(`${recordingUrl}?v=${recordingVersion}`);

    // Event handlers
    originalWs.on('ready', () => setIsOriginalReady(true));
    recordingWs.on('ready', () => setIsRecordingReady(true));

    originalWs.on('play', () => setIsOriginalPlaying(true));
    originalWs.on('pause', () => setIsOriginalPlaying(false));
    originalWs.on('finish', () => setIsOriginalPlaying(false));

    recordingWs.on('play', () => setIsRecordingPlaying(true));
    recordingWs.on('pause', () => setIsRecordingPlaying(false));
    recordingWs.on('finish', () => setIsRecordingPlaying(false));

    // Catch abort errors that occur during load cancellation
    const ignoreAbortError = (err: Error) => {
      if (err.name !== 'AbortError') {
        console.error('WaveSurfer error:', err);
      }
    };
    originalWs.on('error', ignoreAbortError);
    recordingWs.on('error', ignoreAbortError);

    // Cleanup - unsubscribe events and clear containers
    const originalContainer = originalContainerRef.current;
    const recordingContainer = recordingContainerRef.current;

    return () => {
      originalWsRef.current = null;
      recordingWsRef.current = null;
      originalWs.unAll();
      recordingWs.unAll();
      originalWs.pause();
      recordingWs.pause();
      // Clear the DOM elements manually since we can't call destroy()
      if (originalContainer) originalContainer.innerHTML = '';
      if (recordingContainer) recordingContainer.innerHTML = '';
    };
  }, [originalUrl, recordingUrl, recordingVersion]);

  // Apply speed changes
  useEffect(() => {
    if (originalWsRef.current) {
      originalWsRef.current.setPlaybackRate(originalSpeed);
    }
  }, [originalSpeed]);

  useEffect(() => {
    if (recordingWsRef.current) {
      recordingWsRef.current.setPlaybackRate(recordingSpeed);
    }
  }, [recordingSpeed]);

  const playOriginal = useCallback(() => {
    if (originalWsRef.current) {
      if (isOriginalPlaying) {
        originalWsRef.current.pause();
      } else {
        originalWsRef.current.seekTo(0);
        originalWsRef.current.play();
      }
    }
  }, [isOriginalPlaying]);

  const playRecording = useCallback(() => {
    if (recordingWsRef.current) {
      if (isRecordingPlaying) {
        recordingWsRef.current.pause();
      } else {
        recordingWsRef.current.seekTo(0);
        recordingWsRef.current.play();
      }
    }
  }, [isRecordingPlaying]);

  const playBoth = useCallback(() => {
    if (originalWsRef.current && recordingWsRef.current) {
      // Stop both first
      originalWsRef.current.pause();
      recordingWsRef.current.pause();
      originalWsRef.current.seekTo(0);
      recordingWsRef.current.seekTo(0);

      // Play both
      originalWsRef.current.play();
      recordingWsRef.current.play();
    }
  }, []);

  const stopAll = useCallback(() => {
    if (originalWsRef.current) {
      originalWsRef.current.pause();
      originalWsRef.current.seekTo(0);
    }
    if (recordingWsRef.current) {
      recordingWsRef.current.pause();
      recordingWsRef.current.seekTo(0);
    }
  }, []);

  const isLoading = !isOriginalReady || !isRecordingReady;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-medium text-gray-900">Compare Waveforms</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Waveforms */}
        <div className="p-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="ml-2 text-gray-500">Loading...</span>
            </div>
          )}

          {/* Original waveform */}
          <div className={isLoading ? 'opacity-0 h-0 overflow-hidden' : ''}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">Original</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOriginalSpeed(adjustSpeed(originalSpeed, -0.1))}
                  disabled={originalSpeed <= 0.5}
                  className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 border border-gray-200 rounded text-gray-600 text-xs font-medium"
                >
                  −
                </button>
                <span className="text-xs text-gray-600 w-8 text-center tabular-nums">
                  {originalSpeed.toFixed(1)}x
                </span>
                <button
                  onClick={() => setOriginalSpeed(adjustSpeed(originalSpeed, 0.1))}
                  disabled={originalSpeed >= 2}
                  className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 border border-gray-200 rounded text-gray-600 text-xs font-medium"
                >
                  +
                </button>
              </div>
            </div>
            <div
              ref={originalContainerRef}
              className="bg-gray-50 rounded-lg overflow-hidden"
            />
          </div>

          {/* Recording waveform */}
          <div className={isLoading ? 'opacity-0 h-0 overflow-hidden' : ''}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">My Recording</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRecordingSpeed(adjustSpeed(recordingSpeed, -0.1))}
                  disabled={recordingSpeed <= 0.5}
                  className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 border border-gray-200 rounded text-gray-600 text-xs font-medium"
                >
                  −
                </button>
                <span className="text-xs text-gray-600 w-8 text-center tabular-nums">
                  {recordingSpeed.toFixed(1)}x
                </span>
                <button
                  onClick={() => setRecordingSpeed(adjustSpeed(recordingSpeed, 0.1))}
                  disabled={recordingSpeed >= 2}
                  className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 border border-gray-200 rounded text-gray-600 text-xs font-medium"
                >
                  +
                </button>
              </div>
            </div>
            <div
              ref={recordingContainerRef}
              className="bg-gray-50 rounded-lg overflow-hidden"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={playOriginal}
            disabled={isLoading || isRecording}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs sm:text-sm rounded-lg transition-colors"
          >
            {isOriginalPlaying ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            Original
          </button>

          <button
            onClick={playRecording}
            disabled={isLoading || isRecording}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-xs sm:text-sm rounded-lg transition-colors"
          >
            {isRecordingPlaying ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            Mine
          </button>

          <button
            onClick={playBoth}
            disabled={isLoading || isRecording}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white text-xs sm:text-sm rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Both
          </button>

          <button
            onClick={stopAll}
            disabled={isLoading || isRecording}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 text-xs sm:text-sm rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Stop
          </button>

          {/* Recording controls */}
          {isRecording ? (
            <>
              <span className="text-xs text-red-500 font-mono tabular-nums">
                {formatDuration(durationMs)}
              </span>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <button
                onClick={stopRecording}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                Done
              </button>
              <button
                onClick={cancelRecording}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs sm:text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </>
          ) : isSaving || isUploading ? (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-500">Saving...</span>
            </div>
          ) : (
            <button
              onClick={startRecording}
              disabled={isLoading}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white text-xs sm:text-sm rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              Record
            </button>
          )}
        </div>

        {/* Recording error */}
        {recordError && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-xs text-center">
            {recordError}
          </div>
        )}
      </div>
    </div>
  );
}
