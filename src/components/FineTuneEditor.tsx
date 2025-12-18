'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { WaveformEditor, WaveformEditorHandle } from './WaveformEditor';
import { SplitDialog } from './SplitDialog';

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
}

// Working sentence with tracking for merge/split operations
export interface WorkingSentence {
  id: string;
  idx: number;
  foreignText: string;
  translationText: string;
  startMs: number;
  endMs: number;
  confidence: number | null;
  isNew?: boolean; // Created from merge/split
  originalId?: string; // Track original ID for existing sentences
}

interface FineTuneEditorProps {
  lesson: Lesson;
  sentences: Sentence[];
}

export function FineTuneEditor({ lesson, sentences: initialSentences }: FineTuneEditorProps) {
  const router = useRouter();
  const waveformRef = useRef<WaveformEditorHandle>(null);
  const segmentRefsMap = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Working copy of sentences that can be modified by merge/split
  const [workingSentences, setWorkingSentences] = useState<WorkingSentence[]>(() =>
    initialSentences.map((s) => ({
      id: s.id,
      originalId: s.id,
      idx: s.idx,
      foreignText: s.foreignText,
      translationText: s.translationText,
      startMs: s.startMs ?? 0,
      endMs: s.endMs ?? 0,
      confidence: s.confidence,
    }))
  );

  // Multi-select for merge
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Split mode state
  const [splitMode, setSplitMode] = useState<{
    sentenceId: string;
    splitTimeMs: number | null;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Original sentences for comparison
  const originalSentenceMap = useMemo(() => {
    const map = new Map<string, Sentence>();
    initialSentences.forEach((s) => map.set(s.id, s));
    return map;
  }, [initialSentences]);

  // Check if there are any changes (timing, text, or structural)
  const hasChanges = useMemo(() => {
    // Check for structural changes
    if (workingSentences.length !== initialSentences.length) return true;

    // Check each sentence for modifications
    for (const ws of workingSentences) {
      if (ws.isNew) return true; // New sentence from merge/split

      const original = originalSentenceMap.get(ws.id);
      if (!original) return true; // ID not in original (shouldn't happen)

      if (ws.startMs !== (original.startMs ?? 0)) return true;
      if (ws.endMs !== (original.endMs ?? 0)) return true;
      if (ws.foreignText !== original.foreignText) return true;
      if (ws.translationText !== original.translationText) return true;
    }
    return false;
  }, [workingSentences, initialSentences, originalSentenceMap]);

  // Get selected sentence (single selection for playback)
  const selectedSentenceId = useMemo(() => {
    if (selectedIds.size === 1) {
      return Array.from(selectedIds)[0];
    }
    return null;
  }, [selectedIds]);

  // Check if merge is possible (2+ adjacent segments selected)
  const canMerge = useMemo(() => {
    if (selectedIds.size < 2) return false;

    const selectedSentences = workingSentences
      .filter((s) => selectedIds.has(s.id))
      .sort((a, b) => a.idx - b.idx);

    // Check if all selected are adjacent
    for (let i = 0; i < selectedSentences.length - 1; i++) {
      if (selectedSentences[i + 1].idx !== selectedSentences[i].idx + 1) {
        return false;
      }
    }
    return true;
  }, [selectedIds, workingSentences]);

  // Check if split is possible (exactly 1 segment selected)
  const canSplit = selectedIds.size === 1;

  // Handle timing changes from waveform
  const handleTimingsChange = useCallback((timings: { sentenceId: string; startMs: number; endMs: number }[]) => {
    setWorkingSentences((prev) => {
      const timingMap = new Map(timings.map((t) => [t.sentenceId, t]));
      return prev.map((s) => {
        const timing = timingMap.get(s.id);
        if (timing) {
          return { ...s, startMs: timing.startMs, endMs: timing.endMs };
        }
        return s;
      });
    });
  }, []);

  // Handle click on segment in list
  const handleSentenceClick = useCallback(
    (sentenceId: string, event: React.MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        // Multi-select with Ctrl/Cmd
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(sentenceId)) {
            next.delete(sentenceId);
          } else {
            next.add(sentenceId);
          }
          return next;
        });
      } else if (event.shiftKey && selectedIds.size > 0) {
        // Range select with Shift
        const lastSelected = Array.from(selectedIds).pop()!;
        const lastIdx = workingSentences.find((s) => s.id === lastSelected)?.idx ?? 0;
        const currentIdx = workingSentences.find((s) => s.id === sentenceId)?.idx ?? 0;
        const [start, end] = lastIdx < currentIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];

        setSelectedIds((prev) => {
          const next = new Set(prev);
          workingSentences.forEach((s) => {
            if (s.idx >= start && s.idx <= end) {
              next.add(s.id);
            }
          });
          return next;
        });
      } else {
        // Single select
        setSelectedIds(new Set([sentenceId]));
        waveformRef.current?.playSegment(sentenceId);
      }
    },
    [selectedIds, workingSentences]
  );

  // Handle selection from waveform - scroll segment list
  const handleWaveformSelect = useCallback((sentenceId: string | null) => {
    if (sentenceId) {
      setSelectedIds(new Set([sentenceId]));
      const element = segmentRefsMap.current.get(sentenceId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Reindex sentences by startMs
  const reindexSentences = (sentences: WorkingSentence[]): WorkingSentence[] => {
    return sentences
      .sort((a, b) => a.startMs - b.startMs)
      .map((s, idx) => ({ ...s, idx }));
  };

  // Handle merge
  const handleMerge = useCallback(() => {
    if (!canMerge) return;

    const toMerge = workingSentences
      .filter((s) => selectedIds.has(s.id))
      .sort((a, b) => a.idx - b.idx);

    const merged: WorkingSentence = {
      id: uuidv4(),
      idx: toMerge[0].idx,
      foreignText: toMerge.map((s) => s.foreignText).join(' '),
      translationText: toMerge.map((s) => s.translationText).join(' '),
      startMs: Math.min(...toMerge.map((s) => s.startMs)),
      endMs: Math.max(...toMerge.map((s) => s.endMs)),
      confidence: null,
      isNew: true,
    };

    const mergeIds = new Set(toMerge.map((s) => s.id));
    const newSentences = reindexSentences(
      workingSentences.filter((s) => !mergeIds.has(s.id)).concat([merged])
    );

    setWorkingSentences(newSentences);
    setSelectedIds(new Set([merged.id]));
    waveformRef.current?.updateRegions(newSentences);
  }, [canMerge, selectedIds, workingSentences]);

  // Start split mode
  const handleStartSplit = useCallback(() => {
    if (!canSplit) return;
    const sentenceId = Array.from(selectedIds)[0];
    setSplitMode({ sentenceId, splitTimeMs: null });
  }, [canSplit, selectedIds]);

  // Handle split point selection from waveform
  const handleSplitPointSelect = useCallback((timeMs: number) => {
    setSplitMode((prev) => (prev ? { ...prev, splitTimeMs: timeMs } : null));
  }, []);

  // Handle split confirm
  const handleSplitConfirm = useCallback(
    (
      firstText: { foreign: string; translation: string },
      secondText: { foreign: string; translation: string }
    ) => {
      if (!splitMode || splitMode.splitTimeMs === null) return;

      const toSplit = workingSentences.find((s) => s.id === splitMode.sentenceId);
      if (!toSplit) return;

      const first: WorkingSentence = {
        id: uuidv4(),
        idx: toSplit.idx,
        foreignText: firstText.foreign,
        translationText: firstText.translation,
        startMs: toSplit.startMs,
        endMs: splitMode.splitTimeMs,
        confidence: null,
        isNew: true,
      };

      const second: WorkingSentence = {
        id: uuidv4(),
        idx: toSplit.idx + 1,
        foreignText: secondText.foreign,
        translationText: secondText.translation,
        startMs: splitMode.splitTimeMs,
        endMs: toSplit.endMs,
        confidence: null,
        isNew: true,
      };

      const newSentences = reindexSentences(
        workingSentences.flatMap((s) => (s.id === splitMode.sentenceId ? [first, second] : [s]))
      );

      setWorkingSentences(newSentences);
      setSelectedIds(new Set([first.id]));
      setSplitMode(null);
      waveformRef.current?.updateRegions(newSentences);
    },
    [splitMode, workingSentences]
  );

  // Handle reset
  const handleReset = useCallback(() => {
    setWorkingSentences(
      initialSentences.map((s) => ({
        id: s.id,
        originalId: s.id,
        idx: s.idx,
        foreignText: s.foreignText,
        translationText: s.translationText,
        startMs: s.startMs ?? 0,
        endMs: s.endMs ?? 0,
        confidence: s.confidence,
      }))
    );
    setSelectedIds(new Set());
    setSplitMode(null);
    // Force waveform reload
    window.location.reload();
  }, [initialSentences]);

  // Handle save
  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setError(null);

    try {
      // Build timings for all working sentences
      const timings = workingSentences.map((s) => ({
        sentenceId: s.id,
        startMs: s.startMs,
        endMs: s.endMs,
      }));

      // Build operations for structural changes
      const originalIds = new Set(initialSentences.map((s) => s.id));
      const workingIds = new Set(workingSentences.map((s) => s.id));

      const operations = {
        deletes: Array.from(originalIds).filter((id) => !workingIds.has(id)),
        creates: workingSentences
          .filter((s) => s.isNew)
          .map((s) => ({
            id: s.id,
            idx: s.idx,
            foreignText: s.foreignText,
            translationText: s.translationText,
            startMs: s.startMs,
            endMs: s.endMs,
          })),
      };

      const response = await fetch(`/api/lessons/${lesson.id}/fine-tune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timings, operations }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      // Use window.location to bypass Next.js client-side cache
      window.location.href = `/lesson/${lesson.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setIsSaving(false);
    }
  };

  const formatMs = (ms: number) => {
    const seconds = ms / 1000;
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  // Get sentence being split for dialog
  const splitSentence = splitMode ? workingSentences.find((s) => s.id === splitMode.sentenceId) : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b z-10">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              href={`/lesson/${lesson.id}`}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Back to lesson"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-900 text-sm sm:text-base truncate">Fine-tune</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">{lesson.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Merge button */}
            <button
              onClick={handleMerge}
              disabled={!canMerge || isSaving}
              className="p-1.5 sm:px-3 sm:py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-200 transition-colors flex items-center gap-1.5"
              title="Merge selected segments (select 2+ adjacent)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h8m-4-9v18" />
              </svg>
              <span className="hidden sm:inline">Merge</span>
            </button>

            {/* Split button */}
            <button
              onClick={handleStartSplit}
              disabled={!canSplit || isSaving}
              className="p-1.5 sm:px-3 sm:py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-200 transition-colors flex items-center gap-1.5"
              title="Split selected segment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" />
              </svg>
              <span className="hidden sm:inline">Split</span>
            </button>

            <div className="w-px h-5 bg-gray-200 hidden sm:block" />

            {hasChanges && (
              <button
                onClick={handleReset}
                disabled={isSaving}
                className="p-1.5 sm:px-3 sm:py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                title="Reset changes"
              >
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 sm:gap-2"
            >
              {isSaving ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save & Re-slice'}</span>
              <span className="sm:hidden">{isSaving ? '...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="flex-shrink-0 max-w-6xl mx-auto px-4 mt-2 w-full">
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Split mode indicator */}
      {splitMode && (
        <div className="flex-shrink-0 max-w-6xl mx-auto px-4 mt-2 w-full">
          <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm flex items-center justify-between">
            <span>
              <strong>Split mode:</strong> Click on the waveform to select split point
              {splitMode.splitTimeMs !== null && ` (${formatMs(splitMode.splitTimeMs)})`}
            </span>
            <button
              onClick={() => setSplitMode(null)}
              className="text-orange-600 hover:text-orange-800 text-sm underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main content - flex column to fill remaining height */}
      <main className="flex flex-col flex-1 min-h-0 max-w-6xl mx-auto px-4 py-2 w-full">
        {/* Waveform editor */}
        <div className="flex-shrink-0">
          <WaveformEditor
            ref={waveformRef}
            lessonId={lesson.id}
            sentences={workingSentences}
            onTimingsChange={handleTimingsChange}
            selectedSentenceId={selectedSentenceId}
            onSentenceSelect={handleWaveformSelect}
            splitMode={splitMode}
            onSplitPointSelect={handleSplitPointSelect}
          />
        </div>

        {/* Segment list - takes remaining height */}
        <div className="flex-1 mt-4 min-h-0 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex-shrink-0 px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-medium text-gray-900 text-sm">Segments</h2>
              <p className="text-xs text-gray-500">
                {workingSentences.length} sentences
                {selectedIds.size > 1 && ` (${selectedIds.size} selected)`}
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Ctrl+click to multi-select. Shift+click for range.
            </p>
          </div>

          <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
            {workingSentences.map((sentence) => {
              const isSelected = selectedIds.has(sentence.id);
              const original = originalSentenceMap.get(sentence.originalId || sentence.id);
              const isModified =
                sentence.isNew ||
                (original &&
                  (sentence.startMs !== (original.startMs ?? 0) ||
                    sentence.endMs !== (original.endMs ?? 0) ||
                    sentence.foreignText !== original.foreignText));

              return (
                <button
                  key={sentence.id}
                  ref={(el) => {
                    if (el) {
                      segmentRefsMap.current.set(sentence.id, el);
                    } else {
                      segmentRefsMap.current.delete(sentence.id);
                    }
                  }}
                  onClick={(e) => handleSentenceClick(sentence.id, e)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-400 w-6">#{sentence.idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{sentence.foreignText}</p>
                      <p className="text-xs text-gray-500 truncate">{sentence.translationText}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sentence.isNew && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">New</span>
                      )}
                      {isModified && !sentence.isNew && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Modified</span>
                      )}
                      <span className="text-xs text-gray-400 tabular-nums">
                        {formatMs(sentence.startMs)} - {formatMs(sentence.endMs)}
                      </span>
                      <span className="text-xs text-gray-300">
                        ({((sentence.endMs - sentence.startMs) / 1000).toFixed(1)}s)
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Split dialog - only show after split point is selected */}
      {splitMode && splitMode.splitTimeMs !== null && splitSentence && (
        <SplitDialog
          sentence={splitSentence}
          splitTimeMs={splitMode.splitTimeMs}
          onConfirm={handleSplitConfirm}
          onCancel={() => setSplitMode(null)}
          formatMs={formatMs}
        />
      )}
    </div>
  );
}
