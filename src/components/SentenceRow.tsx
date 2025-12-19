'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { PrimaryText } from '@/lib/atoms';
import { RecordButton } from './RecordButton';

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

interface SentenceRowProps {
  sentence: Sentence;
  isActive: boolean;
  isPlaying: boolean;
  isRevealed: boolean;
  primaryText: PrimaryText;
  onPlay: () => void;
  onReveal: () => void;
  // Recording props
  hasRecording?: boolean;
  isPlayingRecording?: boolean;
  onRecordingComplete?: (sentenceId: string, recordingId: string) => void;
  onRecordingDelete?: (sentenceId: string) => void;
  onPlayRecording?: (sentenceId: string) => void;
}

export const SentenceRow = forwardRef<HTMLDivElement, SentenceRowProps>(function SentenceRow({
  sentence,
  isActive,
  isPlaying,
  isRevealed,
  primaryText,
  onPlay,
  onReveal,
  hasRecording = false,
  isPlayingRecording = false,
  onRecordingComplete,
  onRecordingDelete,
  onPlayRecording,
}, ref) {
  const hasLowConfidence = sentence.confidence !== null && sentence.confidence < 0.5;

  // Content based on mode - which text goes to which position
  const alwaysShowContent = primaryText === 'foreign' ? sentence.foreignText : sentence.translationText;
  const hideableContent = primaryText === 'foreign' ? sentence.translationText : sentence.foreignText;

  return (
    <div
      ref={ref}
      className={cn(
        'p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer',
        isActive
          ? 'border-blue-500 bg-blue-50/50'
          : 'border-transparent hover:border-gray-200 hover:bg-gray-50/50'
      )}
      onClick={onPlay}
    >
      {/* Always visible text (top, large) */}
      <div
        className={cn(
          'text-lg leading-relaxed transition-all duration-300 text-slate-800 mb-2',
          isActive && isPlaying && 'text-blue-600'
        )}
      >
        {alwaysShowContent}
      </div>

      {/* Hideable text (bottom, small) */}
      <div className="relative">
        <div
          className={cn(
            'text-slate-500 text-sm leading-relaxed transition-all duration-300',
            !isRevealed && 'blur-sm select-none text-slate-300'
          )}
        >
          {hideableContent}
        </div>
        {!isRevealed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReveal();
            }}
            className="absolute inset-0 flex items-center justify-center bg-white/30 hover:bg-white/10 transition-colors rounded"
          >
            <span className="text-xs text-gray-500 bg-white/80 px-2 py-0.5 rounded-full shadow-sm">
              Click to reveal
            </span>
          </button>
        )}
      </div>

      {/* Footer with controls and indicators */}
      <div className="flex items-center gap-3 mt-3">
        {/* Play indicator */}
        {isActive && isPlaying && (
          <div className="flex items-center gap-1">
            <span className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" />
            <span className="w-1 h-4 bg-blue-500 rounded-full animate-pulse delay-75" />
            <span className="w-1 h-2 bg-blue-500 rounded-full animate-pulse delay-150" />
          </div>
        )}

        {/* Sentence number */}
        <span className="text-xs text-gray-400">
          #{sentence.idx + 1}
        </span>

        {/* Confidence warning */}
        {hasLowConfidence && (
          <span className="text-xs text-amber-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Low match
          </span>
        )}

        {/* Reveal/hide toggle (shown when secondary text can be toggled) */}
        {isRevealed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReveal();
          }}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Hide
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Record button */}
        {onRecordingComplete && onRecordingDelete && (
          <RecordButton
            sentenceId={sentence.id}
            hasRecording={hasRecording}
            isPlayingRecording={isPlayingRecording}
            onRecordingComplete={onRecordingComplete}
            onRecordingDelete={onRecordingDelete}
            onPlayRecording={onPlayRecording}
          />
        )}
      </div>
    </div>
  );
});
