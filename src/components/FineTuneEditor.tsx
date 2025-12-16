'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WaveformEditor } from './WaveformEditor';

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

interface Timing {
  sentenceId: string;
  startMs: number;
  endMs: number;
}

interface FineTuneEditorProps {
  lesson: Lesson;
  sentences: Sentence[];
}

export function FineTuneEditor({ lesson, sentences }: FineTuneEditorProps) {
  const router = useRouter();
  const [selectedSentenceId, setSelectedSentenceId] = useState<string | null>(null);
  const [modifiedTimings, setModifiedTimings] = useState<Map<string, Timing>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Original timings for reset functionality
  const originalTimings = useMemo(() => {
    const map = new Map<string, Timing>();
    sentences.forEach((s) => {
      if (s.startMs !== null && s.endMs !== null) {
        map.set(s.id, { sentenceId: s.id, startMs: s.startMs, endMs: s.endMs });
      }
    });
    return map;
  }, [sentences]);

  // Check if there are changes
  const hasChanges = useMemo(() => {
    if (modifiedTimings.size === 0) return false;

    for (const [id, timing] of modifiedTimings) {
      const original = originalTimings.get(id);
      if (!original) continue;
      if (timing.startMs !== original.startMs || timing.endMs !== original.endMs) {
        return true;
      }
    }
    return false;
  }, [modifiedTimings, originalTimings]);

  // Get current timing for a sentence (modified or original)
  const getTiming = useCallback(
    (sentenceId: string) => {
      return modifiedTimings.get(sentenceId) || originalTimings.get(sentenceId);
    },
    [modifiedTimings, originalTimings]
  );

  const handleTimingsChange = useCallback((timings: Timing[]) => {
    setModifiedTimings((prev) => {
      const next = new Map(prev);
      timings.forEach((t) => next.set(t.sentenceId, t));
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setModifiedTimings(new Map());
    // Force re-render of waveform by reloading the page
    window.location.reload();
  }, []);

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setError(null);

    try {
      // Collect all timings (modified takes precedence)
      const timings: Timing[] = sentences.map((s) => {
        const modified = modifiedTimings.get(s.id);
        if (modified) return modified;
        return {
          sentenceId: s.id,
          startMs: s.startMs ?? 0,
          endMs: s.endMs ?? 0,
        };
      });

      const response = await fetch(`/api/lessons/${lesson.id}/fine-tune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timings }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      // Redirect to lesson page (it will show processing status)
      router.push(`/lesson/${lesson.id}`);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/lesson/${lesson.id}`}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Back to lesson"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="font-semibold text-gray-900">Fine-tune Segments</h1>
              <p className="text-sm text-gray-500">{lesson.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={handleReset}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSaving ? 'Saving...' : 'Save & Re-slice'}
            </button>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Waveform editor - takes 2 columns */}
          <div className="lg:col-span-2">
            <WaveformEditor
              lessonId={lesson.id}
              sentences={sentences}
              onTimingsChange={handleTimingsChange}
              selectedSentenceId={selectedSentenceId}
              onSentenceSelect={setSelectedSentenceId}
            />
          </div>

          {/* Segment list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="font-medium text-gray-900">Segments</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {sentences.length} sentences
                </p>
              </div>

              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {sentences.map((sentence) => {
                  const timing = getTiming(sentence.id);
                  const isSelected = sentence.id === selectedSentenceId;
                  const isModified = modifiedTimings.has(sentence.id);

                  return (
                    <button
                      key={sentence.id}
                      onClick={() => setSelectedSentenceId(sentence.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-400">
                              #{sentence.idx + 1}
                            </span>
                            {isModified && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                                Modified
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 truncate mt-1">
                            {sentence.foreignText}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {sentence.translationText}
                          </p>
                        </div>
                      </div>

                      {timing && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                          <span>{formatMs(timing.startMs)}</span>
                          <span>-</span>
                          <span>{formatMs(timing.endMs)}</span>
                          <span className="text-gray-300">
                            ({((timing.endMs - timing.startMs) / 1000).toFixed(1)}s)
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
