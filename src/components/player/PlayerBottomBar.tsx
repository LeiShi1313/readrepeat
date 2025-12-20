'use client';

import { AutoPlayModeButton, type AutoPlayMode } from './AutoPlayModeButton';

interface PlayerBottomBarProps {
  currentIndex: number;
  totalSentences: number;
  isPlaying: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  autoPlayMode: AutoPlayMode;
  onAutoPlayModeChange: (mode: AutoPlayMode) => void;
}

export function PlayerBottomBar({
  currentIndex,
  totalSentences,
  isPlaying,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onPlayPause,
  autoPlayMode,
  onAutoPlayModeChange,
}: PlayerBottomBarProps) {
  const progressPercent = ((currentIndex + 1) / totalSentences) * 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
      <div className="max-w-3xl mx-auto px-4 py-3">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 rounded-full mb-3">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Sentence counter */}
          <span className="text-sm text-gray-500 min-w-[100px]">
            {currentIndex + 1} / {totalSentences}
          </span>

          {/* Audio controls */}
          <div className="flex items-center gap-2">
            {/* Previous button */}
            <button
              onClick={onPrev}
              disabled={!canGoPrev}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous sentence (K)"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Play/Pause button */}
            <button
              onClick={onPlayPause}
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
              onClick={onNext}
              disabled={!canGoNext}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next sentence (J)"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Auto-play mode toggle */}
          <AutoPlayModeButton mode={autoPlayMode} onModeChange={onAutoPlayModeChange} />
        </div>
      </div>
    </div>
  );
}
