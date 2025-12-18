'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingState = 'idle' | 'recording' | 'saving' | 'error';

interface UseVoiceRecorderOptions {
  onRecordingComplete?: (blob: Blob, durationMs: number) => void;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const { onRecordingComplete } = options;

  const [state, setState] = useState<RecordingState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Check if mediaDevices is available (requires HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone requires HTTPS');
        setState('error');
        return;
      }

      setState('recording');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // Create MediaRecorder with webm/opus format for good compression
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const duration = Date.now() - startTimeRef.current;

        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        if (onRecordingComplete && chunksRef.current.length > 0) {
          onRecordingComplete(blob, duration);
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording failed');
        setState('error');
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setDurationMs(0);

      // Update duration timer
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current);
      }, 100);

    } catch (err) {
      console.error('Failed to start recording:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone permission denied');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No microphone found');
      } else {
        setError('Failed to start recording');
      }
      setState('error');
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setState('saving');
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Clear chunks so onstop doesn't trigger callback
    chunksRef.current = [];

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState('idle');
    setDurationMs(0);
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setDurationMs(0);
  }, []);

  return {
    state,
    isRecording: state === 'recording',
    isSaving: state === 'saving',
    durationMs,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}
