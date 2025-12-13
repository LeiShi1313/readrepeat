'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { SentenceRow } from './SentenceRow';
import { DownloadIndicator } from './DownloadIndicator';
import type { PlayMode } from './ModeToggle';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAudioCache } from '@/hooks/useAudioCache';

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
  mode: PlayMode;
}

export function Player({ lesson, mode }: PlayerProps) {
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [revealedSentences, setRevealedSentences] = useState<Set<number>>(new Set());
  const [lastPlayedUrl, setLastPlayedUrl] = useState<string | null>(null);

  const { isPlaying, playClip, pause, setPlaybackRate, playbackRate } = useAudioPlayer();

  const currentSentence = lesson.sentences[currentSentenceIdx];

  // Generate clip URLs for caching
  const clipUrls = useMemo(
    () => lesson.sentences.map((s) => `/api/media/sentences/${s.id}/clip`),
    [lesson.sentences]
  );

  const { cached, total, isDownloading, isAllCached, cacheAudio, cacheAllAudio } =
    useAudioCache(clipUrls);

  // Auto-cache after playing a clip
  useEffect(() => {
    if (lastPlayedUrl && !isPlaying) {
      cacheAudio(lastPlayedUrl);
      setLastPlayedUrl(null);
    }
  }, [isPlaying, lastPlayedUrl, cacheAudio]);

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

  const revealAll = useCallback(() => {
    const allIndices = lesson.sentences.map((_, i) => i);
    setRevealedSentences(new Set(allIndices));
  }, [lesson.sentences]);

  const hideAll = useCallback(() => {
    setRevealedSentences(new Set());
  }, []);

  const playCurrentSentence = useCallback(() => {
    if (currentSentence?.id) {
      const url = `/api/media/sentences/${currentSentence.id}/clip`;
      playClip(url);
      setLastPlayedUrl(url);
    }
  }, [currentSentence, playClip]);

  const playSentence = useCallback(
    (sentence: Sentence, idx: number) => {
      setCurrentSentenceIdx(idx);
      if (sentence.id) {
        const url = `/api/media/sentences/${sentence.id}/clip`;
        playClip(url);
        setLastPlayedUrl(url);
      }
    },
    [playClip]
  );

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => ({
      ' ': () => {
        if (isPlaying) {
          pause();
        } else {
          playCurrentSentence();
        }
      },
      ArrowRight: goToNext,
      ArrowLeft: goToPrev,
      ArrowDown: goToNext,
      ArrowUp: goToPrev,
      j: goToNext,
      k: goToPrev,
      Enter: () => revealSentence(currentSentenceIdx),
      h: () => revealSentence(currentSentenceIdx),
    }),
    [isPlaying, pause, playCurrentSentence, goToNext, goToPrev, revealSentence, currentSentenceIdx]
  );

  useKeyboardShortcuts(shortcuts);

  const allRevealed = revealedSentences.size === lesson.sentences.length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b z-10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {lesson.title}
          </h1>
          <div className="flex items-center gap-3">
            {/* Mode B: Reveal all/Hide all controls */}
            {mode === 'B' && (
              <button
                onClick={allRevealed ? hideAll : revealAll}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {allRevealed ? 'Hide all' : 'Reveal all'}
              </button>
            )}
            {/* Download indicator */}
            <DownloadIndicator
              cached={cached}
              total={total}
              isDownloading={isDownloading}
              isAllCached={isAllCached}
              onDownloadAll={cacheAllAudio}
            />
            {/* Playback speed */}
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.6}>0.6x</option>
              <option value={0.7}>0.7x</option>
              <option value={0.8}>0.8x</option>
              <option value={0.9}>0.9x</option>
              <option value={1}>1x</option>
              <option value={1.1}>1.1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={1.75}>1.75x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sentence list */}
      <div className="px-4 py-6 space-y-2 pb-32">
        {lesson.sentences.map((sentence, idx) => (
          <SentenceRow
            key={sentence.id}
            sentence={sentence}
            isActive={idx === currentSentenceIdx}
            isPlaying={idx === currentSentenceIdx && isPlaying}
            isRevealed={mode === 'A' || revealedSentences.has(idx)}
            mode={mode}
            onPlay={() => playSentence(sentence, idx)}
            onReveal={() => revealSentence(idx)}
          />
        ))}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100 rounded-full mb-3">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{
                width: `${((currentSentenceIdx + 1) / lesson.sentences.length) * 100}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Sentence {currentSentenceIdx + 1} of {lesson.sentences.length}
            </span>

            {/* Keyboard hints */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
              <span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Space</kbd> Play
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">J/K</kbd> Navigate
              </span>
              {mode === 'B' && (
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">H</kbd> Reveal
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
