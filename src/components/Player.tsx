'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { SentenceRow } from './SentenceRow';
import { DownloadIndicator } from './DownloadIndicator';
import type { PrimaryText } from '@/lib/atoms';
import { PlayerBottomBar, type AutoPlayMode } from './player';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRecordingStatus } from '@/hooks/useRecordingStatus';

interface Sentence {
  id: string;
  idx: number;
  foreignText: string;
  translationText: string;
  startMs: number | null;
  endMs: number | null;
  clipPath: string | null;
  confidence: number | null;
}

interface Lesson {
  id: string;
  title: string;
  foreignLang: string;
  translationLang: string;
  status: string;
  sentences: Sentence[];
}

interface PlayerProps {
  lesson: Lesson;
  primaryText: PrimaryText;
  playbackSpeed: number;
  revealAll: boolean;
  // Audio cache
  cached: number;
  total: number;
  isDownloading: boolean;
  isAllCached: boolean;
  onDownloadAll: () => void;
  onCacheAudio: (url: string) => void;
}

export function Player({
  lesson,
  primaryText,
  playbackSpeed,
  revealAll,
  cached,
  total,
  isDownloading,
  isAllCached,
  onDownloadAll,
  onCacheAudio,
}: PlayerProps) {
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [revealedSentences, setRevealedSentences] = useState<Set<number>>(new Set());
  const [lastPlayedUrl, setLastPlayedUrl] = useState<string | null>(null);
  const [autoPlayMode, setAutoPlayMode] = useState<AutoPlayMode>('off');
  const [wasPlaying, setWasPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);

  const activeSentenceRef = useRef<HTMLDivElement>(null);

  const { isPlaying, playClip, pause, setPlaybackRate } = useAudioPlayer();

  // Sync playback rate from props
  useEffect(() => {
    setPlaybackRate(playbackSpeed);
  }, [playbackSpeed, setPlaybackRate]);

  const currentSentence = lesson.sentences[currentSentenceIdx];

  // Recording status for all sentences
  const sentenceIds = useMemo(
    () => lesson.sentences.map((s) => s.id),
    [lesson.sentences]
  );
  const { hasRecording, markRecordingAdded, markRecordingRemoved } = useRecordingStatus(sentenceIds);

  // Clear playing recording state when audio stops
  useEffect(() => {
    if (!isPlaying) {
      setPlayingRecordingId(null);
    }
  }, [isPlaying]);

  // Handle recording complete
  const handleRecordingComplete = useCallback((sentenceId: string, recordingId: string) => {
    markRecordingAdded(sentenceId, recordingId, null);
  }, [markRecordingAdded]);

  // Handle recording delete
  const handleRecordingDelete = useCallback((sentenceId: string) => {
    markRecordingRemoved(sentenceId);
  }, [markRecordingRemoved]);

  // Play user's recording for a sentence
  const handlePlayRecording = useCallback((sentenceId: string) => {
    const idx = lesson.sentences.findIndex((s) => s.id === sentenceId);
    if (idx !== -1) {
      setCurrentSentenceIdx(idx);
    }
    const url = `/api/media/recordings/${sentenceId}`;
    setPlayingRecordingId(sentenceId);
    playClip(url);
  }, [playClip, lesson.sentences]);

  // Auto-cache after playing a clip
  useEffect(() => {
    if (lastPlayedUrl && !isPlaying) {
      onCacheAudio(lastPlayedUrl);
      setLastPlayedUrl(null);
    }
  }, [isPlaying, lastPlayedUrl, onCacheAudio]);

  // Track playing state for continuous play detection
  useEffect(() => {
    setWasPlaying(isPlaying);
  }, [isPlaying]);

  // Auto-play: handle different modes when clip finishes naturally (not user-paused)
  useEffect(() => {
    if (autoPlayMode !== 'off' && wasPlaying && !isPlaying && !userPaused && !playingRecordingId) {
      if (autoPlayMode === 'repeat') {
        const url = `/api/media/sentences/${currentSentence.id}/clip`;
        setTimeout(() => {
          playClip(url);
          setLastPlayedUrl(url);
        }, 100);
      } else if (autoPlayMode === 'once' || autoPlayMode === 'loop') {
        if (currentSentenceIdx < lesson.sentences.length - 1) {
          const nextIdx = currentSentenceIdx + 1;
          const nextSentence = lesson.sentences[nextIdx];
          setCurrentSentenceIdx(nextIdx);
          if (nextSentence?.id) {
            const url = `/api/media/sentences/${nextSentence.id}/clip`;
            setTimeout(() => {
              playClip(url);
              setLastPlayedUrl(url);
            }, 100);
          }
        } else if (autoPlayMode === 'loop') {
          const firstSentence = lesson.sentences[0];
          setCurrentSentenceIdx(0);
          if (firstSentence?.id) {
            const url = `/api/media/sentences/${firstSentence.id}/clip`;
            setTimeout(() => {
              playClip(url);
              setLastPlayedUrl(url);
            }, 100);
          }
        }
      }
    }
  }, [isPlaying, wasPlaying, autoPlayMode, currentSentenceIdx, currentSentence, lesson.sentences, playClip, userPaused, playingRecordingId]);

  // Auto-scroll to center the active sentence when auto-play is enabled
  useEffect(() => {
    if (autoPlayMode !== 'off' && activeSentenceRef.current) {
      activeSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [autoPlayMode, currentSentenceIdx]);

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (currentSentenceIdx < lesson.sentences.length - 1) {
      setCurrentSentenceIdx((prev) => prev + 1);
    }
  }, [currentSentenceIdx, lesson.sentences.length]);

  const goToPrev = useCallback(() => {
    if (currentSentenceIdx > 0) {
      setCurrentSentenceIdx((prev) => prev - 1);
    }
  }, [currentSentenceIdx]);

  const revealSentence = useCallback((idx: number) => {
    setRevealedSentences((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const playCurrentSentence = useCallback(() => {
    if (currentSentence?.id) {
      setUserPaused(false);
      const url = `/api/media/sentences/${currentSentence.id}/clip`;
      playClip(url);
      setLastPlayedUrl(url);
    }
  }, [currentSentence, playClip]);

  const handlePause = useCallback(() => {
    setUserPaused(true);
    pause();
  }, [pause]);

  const playSentence = useCallback(
    (sentence: Sentence, idx: number) => {
      setUserPaused(false);
      setCurrentSentenceIdx(idx);
      if (sentence.id) {
        const url = `/api/media/sentences/${sentence.id}/clip`;
        playClip(url);
        setLastPlayedUrl(url);
      }
    },
    [playClip]
  );

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      playCurrentSentence();
    }
  }, [isPlaying, handlePause, playCurrentSentence]);

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => ({
      ' ': handlePlayPause,
      ArrowRight: goToNext,
      ArrowLeft: goToPrev,
      ArrowDown: goToNext,
      ArrowUp: goToPrev,
      j: goToNext,
      k: goToPrev,
      Enter: () => revealSentence(currentSentenceIdx),
      h: () => revealSentence(currentSentenceIdx),
    }),
    [handlePlayPause, goToNext, goToPrev, revealSentence, currentSentenceIdx]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Title bar */}
      <div className="px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900 truncate min-w-0 flex-1">
          {lesson.title}
        </h1>
        <DownloadIndicator
          cached={cached}
          total={total}
          isDownloading={isDownloading}
          isAllCached={isAllCached}
          onDownloadAll={onDownloadAll}
        />
      </div>

      {/* Sentence list */}
      <div className="px-4 py-2 space-y-2 pb-32">
        {lesson.sentences.map((sentence, idx) => (
          <SentenceRow
            key={sentence.id}
            ref={idx === currentSentenceIdx ? activeSentenceRef : null}
            sentence={sentence}
            isActive={idx === currentSentenceIdx}
            isPlaying={idx === currentSentenceIdx && isPlaying}
            isRevealed={revealAll || revealedSentences.has(idx)}
            primaryText={primaryText}
            onPlay={() => playSentence(sentence, idx)}
            onReveal={() => revealSentence(idx)}
            hasRecording={hasRecording(sentence.id)}
            isPlayingRecording={playingRecordingId === sentence.id && isPlaying}
            onRecordingComplete={handleRecordingComplete}
            onRecordingDelete={handleRecordingDelete}
            onPlayRecording={handlePlayRecording}
          />
        ))}
      </div>

      <PlayerBottomBar
        currentIndex={currentSentenceIdx}
        totalSentences={lesson.sentences.length}
        isPlaying={isPlaying}
        canGoPrev={currentSentenceIdx > 0}
        canGoNext={currentSentenceIdx < lesson.sentences.length - 1}
        onPrev={goToPrev}
        onNext={goToNext}
        onPlayPause={handlePlayPause}
        autoPlayMode={autoPlayMode}
        onAutoPlayModeChange={setAutoPlayMode}
      />
    </div>
  );
}
