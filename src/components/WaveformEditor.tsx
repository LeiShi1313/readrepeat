'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { WorkingSentence } from './FineTuneEditor';

interface Timing {
  sentenceId: string;
  startMs: number;
  endMs: number;
}

interface WaveformEditorProps {
  lessonId: string;
  sentences: WorkingSentence[];
  onTimingsChange: (timings: Timing[]) => void;
  selectedSentenceId: string | null;
  onSentenceSelect: (id: string | null) => void;
  splitMode?: { sentenceId: string; splitTimeMs: number | null } | null;
  onSplitPointSelect?: (timeMs: number) => void;
}

export interface WaveformEditorHandle {
  playSegment: (segmentId: string) => void;
  updateRegions: (sentences: WorkingSentence[]) => void;
}

// Colors for regions
const REGION_COLORS = [
  'rgba(59, 130, 246, 0.3)',   // blue
  'rgba(16, 185, 129, 0.3)',   // green
  'rgba(249, 115, 22, 0.3)',   // orange
  'rgba(139, 92, 246, 0.3)',   // purple
  'rgba(236, 72, 153, 0.3)',   // pink
  'rgba(20, 184, 166, 0.3)',   // teal
];

const SELECTED_COLOR = 'rgba(59, 130, 246, 0.5)';
const SPLIT_TARGET_COLOR = 'rgba(249, 115, 22, 0.5)';

export const WaveformEditor = forwardRef<WaveformEditorHandle, WaveformEditorProps>(function WaveformEditor({
  lessonId,
  sentences,
  onTimingsChange,
  selectedSentenceId,
  onSentenceSelect,
  splitMode,
  onSplitPointSelect,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const splitLineRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(50);
  const stopListenerRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);
  const sentencesRef = useRef<WorkingSentence[]>(sentences);
  const selectedSentenceIdRef = useRef<string | null>(selectedSentenceId);
  const splitModeRef = useRef(splitMode);
  const onTimingsChangeRef = useRef(onTimingsChange);
  const onSentenceSelectRef = useRef(onSentenceSelect);

  // Keep refs up to date
  useEffect(() => {
    sentencesRef.current = sentences;
  }, [sentences]);

  useEffect(() => {
    selectedSentenceIdRef.current = selectedSentenceId;
  }, [selectedSentenceId]);

  useEffect(() => {
    splitModeRef.current = splitMode;
  }, [splitMode]);

  useEffect(() => {
    onTimingsChangeRef.current = onTimingsChange;
  }, [onTimingsChange]);

  useEffect(() => {
    onSentenceSelectRef.current = onSentenceSelect;
  }, [onSentenceSelect]);

  const onSplitPointSelectRef = useRef(onSplitPointSelect);
  useEffect(() => {
    onSplitPointSelectRef.current = onSplitPointSelect;
  }, [onSplitPointSelect]);

  // Create regions from sentences (uses refs to avoid recreating wavesurfer)
  const createRegions = useCallback((regionsSentences: WorkingSentence[]) => {
    if (!regionsRef.current) return;

    const regions = regionsRef.current;
    const currentSelectedId = selectedSentenceIdRef.current;
    const currentSplitMode = splitModeRef.current;

    // Clear existing regions
    regions.getRegions().forEach((region) => region.remove());

    // Create new regions
    regionsSentences.forEach((sentence, idx) => {
      const isSelected = sentence.id === currentSelectedId;
      const isSplitTarget = currentSplitMode?.sentenceId === sentence.id;

      regions.addRegion({
        id: sentence.id,
        start: sentence.startMs / 1000,
        end: sentence.endMs / 1000,
        color: isSplitTarget ? SPLIT_TARGET_COLOR : isSelected ? SELECTED_COLOR : REGION_COLORS[idx % REGION_COLORS.length],
        drag: !currentSplitMode, // Disable drag in split mode
        resize: !currentSplitMode, // Disable resize in split mode
      });
    });
  }, []);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    // Thick bars for fine-tune page
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#94a3b8',
      progressColor: '#3b82f6',
      cursorColor: '#1e40af',
      cursorWidth: 2,
      height: 128,
      barWidth: 3,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      minPxPerSec: 50,
      plugins: [regions],
    });

    wavesurferRef.current = wavesurfer;

    // Load normalized audio
    wavesurfer.load(`/api/media/lessons/${lessonId}/normalized`);

    // Event handlers
    wavesurfer.on('ready', () => {
      setIsReady(true);
      setDuration(wavesurfer.getDuration());

      // Create initial regions
      createRegions(sentencesRef.current);
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));
    wavesurfer.on('timeupdate', (time) => setCurrentTime(time));

    // Region events
    regions.on('region-updated', () => {
      const allRegions = regions.getRegions();
      const timings: Timing[] = allRegions.map((region) => ({
        sentenceId: region.id,
        startMs: Math.round(region.start * 1000),
        endMs: Math.round(region.end * 1000),
      }));
      onTimingsChangeRef.current(timings);
    });

    regions.on('region-clicked', (region, e) => {
      e.stopPropagation();

      const currentSplitMode = splitModeRef.current;

      // If in split mode and clicking the target region, set split point
      if (currentSplitMode && currentSplitMode.sentenceId === region.id && onSplitPointSelectRef.current) {
        // Get click position within the waveform
        const wrapper = wavesurfer.getWrapper();
        const rect = wrapper.getBoundingClientRect();
        const clickX = (e as MouseEvent).clientX - rect.left + wrapper.scrollLeft;
        const relativeX = clickX / wrapper.scrollWidth;
        const clickedTime = relativeX * wavesurfer.getDuration();
        const clickedTimeMs = Math.round(clickedTime * 1000);

        // Clamp to region bounds with minimum 100ms from edges
        const clampedTimeMs = Math.max(
          Math.round(region.start * 1000) + 100,
          Math.min(Math.round(region.end * 1000) - 100, clickedTimeMs)
        );

        onSplitPointSelectRef.current(clampedTimeMs);
        return;
      }

      // Normal behavior: select and play
      onSentenceSelectRef.current(region.id);

      // Cancel any existing RAF loop
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Get current region boundaries
      const startTime = region.start;
      const endTime = region.end;

      // Play from region start
      wavesurfer.setTime(startTime);
      wavesurfer.play();

      // Use requestAnimationFrame for precise stop timing
      const checkTime = () => {
        if (!wavesurfer.isPlaying()) {
          rafRef.current = null;
          return;
        }

        const currentTime = wavesurfer.getCurrentTime();
        if (currentTime >= endTime) {
          wavesurfer.pause();
          wavesurfer.setTime(endTime);
          rafRef.current = null;
          return;
        }

        rafRef.current = requestAnimationFrame(checkTime);
      };

      rafRef.current = requestAnimationFrame(checkTime);
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (wavesurfer) {
        wavesurfer.destroy();
        wavesurferRef.current = null;
        regionsRef.current = null;
      }
    };
    // Note: createRegions is stable (no deps) so not included here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Update split line position
  useEffect(() => {
    if (!containerRef.current || !wavesurferRef.current || !isReady) return;

    // Remove existing split line
    if (splitLineRef.current) {
      splitLineRef.current.remove();
      splitLineRef.current = null;
    }

    // Create split line if in split mode with a selected point
    if (splitMode?.splitTimeMs !== null && splitMode?.splitTimeMs !== undefined) {
      const wavesurfer = wavesurferRef.current;
      const duration = wavesurfer.getDuration();
      const relativePosition = (splitMode.splitTimeMs / 1000) / duration;

      const container = containerRef.current;
      const waveformWidth = container.scrollWidth;
      const leftPosition = relativePosition * waveformWidth;

      const line = document.createElement('div');
      line.className = 'absolute top-0 bottom-0 w-0.5 bg-orange-500 z-10 pointer-events-none';
      line.style.left = `${leftPosition}px`;

      // Add a label
      const label = document.createElement('div');
      label.className = 'absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded whitespace-nowrap';
      label.textContent = 'Split';
      line.appendChild(label);

      container.style.position = 'relative';
      container.appendChild(line);
      splitLineRef.current = line;
    }

    return () => {
      if (splitLineRef.current) {
        splitLineRef.current.remove();
        splitLineRef.current = null;
      }
    };
  }, [splitMode, isReady, zoom]);

  // Update region colors when selection or split mode changes
  useEffect(() => {
    if (!regionsRef.current || !isReady) return;

    const regions = regionsRef.current.getRegions();
    regions.forEach((region) => {
      const idx = sentencesRef.current.findIndex((s) => s.id === region.id);
      const isSelected = region.id === selectedSentenceId;
      const isSplitTarget = splitMode?.sentenceId === region.id;

      region.setOptions({
        color: isSplitTarget ? SPLIT_TARGET_COLOR : isSelected ? SELECTED_COLOR : REGION_COLORS[idx % REGION_COLORS.length],
        drag: !splitMode,
        resize: !splitMode,
      });
    });
  }, [selectedSentenceId, splitMode, isReady]);

  // Handle zoom changes
  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.zoom(zoom);
    }
  }, [zoom, isReady]);

  // Helper function to play a region by ID
  const playRegionById = useCallback((regionId: string) => {
    if (!regionsRef.current || !wavesurferRef.current) return;

    const regions = regionsRef.current.getRegions();
    const region = regions.find((r) => r.id === regionId);
    if (!region) return;

    const wavesurfer = wavesurferRef.current;

    // Cancel any existing RAF loop
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Remove any existing stop listener
    if (stopListenerRef.current) {
      stopListenerRef.current();
      stopListenerRef.current = null;
    }

    const startTime = region.start;
    const endTime = region.end;

    wavesurfer.setTime(startTime);
    wavesurfer.play();

    const checkTime = () => {
      if (!wavesurfer.isPlaying()) {
        rafRef.current = null;
        return;
      }

      const currentTime = wavesurfer.getCurrentTime();
      if (currentTime >= endTime) {
        wavesurfer.pause();
        wavesurfer.setTime(endTime);
        rafRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(checkTime);
    };

    rafRef.current = requestAnimationFrame(checkTime);
    stopListenerRef.current = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Update regions (called after merge/split)
  const updateRegions = useCallback((newSentences: WorkingSentence[]) => {
    sentencesRef.current = newSentences;
    createRegions(newSentences);
  }, [createRegions]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    playSegment: playRegionById,
    updateRegions,
  }), [playRegionById, updateRegions]);

  const handlePlayPause = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  }, []);

  const handlePlaySelected = useCallback(() => {
    if (selectedSentenceId) {
      playRegionById(selectedSentenceId);
    }
  }, [selectedSentenceId, playRegionById]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Controls bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            disabled={!isReady}
            className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Play selected segment */}
          <button
            onClick={handlePlaySelected}
            disabled={!isReady || !selectedSentenceId}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Play selected segment"
          >
            Play Segment
          </button>

          {/* Time display */}
          <span className="text-sm text-gray-500 ml-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Zoom:</span>
          <input
            type="range"
            min="10"
            max="200"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <button
            onClick={() => setZoom(50)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Waveform container */}
      <div className="relative">
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading audio...</span>
            </div>
          </div>
        )}
        <div ref={containerRef} className="px-4 py-4 overflow-x-auto" />
      </div>

      {/* Instructions */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {splitMode
            ? 'Click on the waveform within the highlighted region to set the split point.'
            : 'Drag region edges to adjust boundaries. Click a region to select and play it.'}
        </p>
      </div>
    </div>
  );
});
