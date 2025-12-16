'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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

// Play modes: off, once (play all once), loop (repeat all), repeat (repeat current)
type AutoPlayMode = 'off' | 'once' | 'loop' | 'repeat';

export function Player({ lesson, mode }: PlayerProps) {
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [revealedSentences, setRevealedSentences] = useState<Set<number>>(new Set());
  const [lastPlayedUrl, setLastPlayedUrl] = useState<string | null>(null);
  const [autoPlayMode, setAutoPlayMode] = useState<AutoPlayMode>('off');
  const [wasPlaying, setWasPlaying] = useState(false);

  const activeSentenceRef = useRef<HTMLDivElement>(null);

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

  // Track playing state for continuous play detection
  useEffect(() => {
    setWasPlaying(isPlaying);
  }, [isPlaying]);

  // Auto-play: handle different modes when clip finishes
  useEffect(() => {
    if (autoPlayMode !== 'off' && wasPlaying && !isPlaying) {
      // Clip just finished
      if (autoPlayMode === 'repeat') {
        // Repeat current sentence
        const url = `/api/media/sentences/${currentSentence.id}/clip`;
        setTimeout(() => {
          playClip(url);
          setLastPlayedUrl(url);
        }, 100);
      } else if (autoPlayMode === 'once' || autoPlayMode === 'loop') {
        // Check if we can advance
        if (currentSentenceIdx < lesson.sentences.length - 1) {
          // Advance to next
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
          // Loop back to beginning
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
        // For 'once' mode at end, just stop (do nothing)
      }
    }
  }, [isPlaying, wasPlaying, autoPlayMode, currentSentenceIdx, currentSentence, lesson.sentences, playClip]);

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
            ref={idx === currentSentenceIdx ? activeSentenceRef : null}
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

          <div className="flex items-center justify-between">
            {/* Sentence counter */}
            <span className="text-sm text-gray-500 min-w-[100px]">
              {currentSentenceIdx + 1} / {lesson.sentences.length}
            </span>

            {/* Audio controls */}
            <div className="flex items-center gap-2">
              {/* Previous button */}
              <button
                onClick={goToPrev}
                disabled={currentSentenceIdx === 0}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous sentence (K)"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Play/Pause button */}
              <button
                onClick={() => isPlaying ? pause() : playCurrentSentence()}
                className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                title="Play/Pause (Space)"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Next button */}
              <button
                onClick={goToNext}
                disabled={currentSentenceIdx === lesson.sentences.length - 1}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next sentence (J)"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Auto-play mode toggle */}
            <button
              onClick={() => {
                const modes: AutoPlayMode[] = ['off', 'once', 'loop', 'repeat'];
                const currentIndex = modes.indexOf(autoPlayMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                setAutoPlayMode(modes[nextIndex]);
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors min-w-[100px] justify-end ${
                autoPlayMode !== 'off'
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title={
                autoPlayMode === 'off' ? 'Auto-play off' :
                autoPlayMode === 'once' ? 'Play all once' :
                autoPlayMode === 'loop' ? 'Loop all' :
                'Repeat current'
              }
            >
              {autoPlayMode === 'off' && (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Off</span>
                </>
              )}
              {autoPlayMode === 'once' && (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  <span>All</span>
                </>
              )}
              {autoPlayMode === 'loop' && (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Loop</span>
                </>
              )}
              {autoPlayMode === 'repeat' && (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m0 0a8.001 8.001 0 0115.356 2M4.582 9H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    <text x="12" y="13" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">1</text>
                  </svg>
                  <span>Repeat</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
