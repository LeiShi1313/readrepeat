'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAbortErrorSuppressor } from '@/hooks/useAbortErrorSuppressor';
import { formatDuration } from '@/lib/utils';
import { PlayIcon, PauseIcon, StopIcon, CloseIcon, MicIcon } from '@/components/ui/icons';
import { SpeedControl } from '@/components/ui/SpeedControl';

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

  useAbortErrorSuppressor();

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
            <CloseIcon className="text-gray-500" />
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
              <SpeedControl speed={originalSpeed} onSpeedChange={setOriginalSpeed} />
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
              <SpeedControl speed={recordingSpeed} onSpeedChange={setRecordingSpeed} />
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
            {isOriginalPlaying ? <PauseIcon /> : <PlayIcon />}
            Original
          </button>

          <button
            onClick={playRecording}
            disabled={isLoading || isRecording}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-xs sm:text-sm rounded-lg transition-colors"
          >
            {isRecordingPlaying ? <PauseIcon /> : <PlayIcon />}
            Mine
          </button>

          <button
            onClick={playBoth}
            disabled={isLoading || isRecording}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white text-xs sm:text-sm rounded-lg transition-colors"
          >
            <PlayIcon />
            Both
          </button>

          <button
            onClick={stopAll}
            disabled={isLoading || isRecording}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 text-xs sm:text-sm rounded-lg transition-colors"
          >
            <StopIcon />
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
                <StopIcon />
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
              <MicIcon />
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
