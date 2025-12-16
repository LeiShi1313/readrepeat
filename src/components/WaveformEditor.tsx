'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

interface Sentence {
  id: string;
  idx: number;
  foreignText: string;
  translationText: string;
  startMs: number | null;
  endMs: number | null;
}

interface Timing {
  sentenceId: string;
  startMs: number;
  endMs: number;
}

interface WaveformEditorProps {
  lessonId: string;
  sentences: Sentence[];
  onTimingsChange: (timings: Timing[]) => void;
  selectedSentenceId: string | null;
  onSentenceSelect: (id: string | null) => void;
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

export function WaveformEditor({
  lessonId,
  sentences,
  onTimingsChange,
  selectedSentenceId,
  onSentenceSelect,
}: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(50);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#94a3b8',
      progressColor: '#3b82f6',
      cursorColor: '#1e40af',
      cursorWidth: 2,
      height: 128,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      plugins: [regions],
    });

    wavesurferRef.current = wavesurfer;

    // Load audio
    wavesurfer.load(`/api/media/lessons/${lessonId}/original`);

    // Event handlers
    wavesurfer.on('ready', () => {
      setIsReady(true);
      setDuration(wavesurfer.getDuration());

      // Create regions for each sentence
      sentences.forEach((sentence, idx) => {
        if (sentence.startMs !== null && sentence.endMs !== null) {
          regions.addRegion({
            id: sentence.id,
            start: sentence.startMs / 1000,
            end: sentence.endMs / 1000,
            color: REGION_COLORS[idx % REGION_COLORS.length],
            drag: true,
            resize: true,
          });
        }
      });
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));
    wavesurfer.on('timeupdate', (time) => setCurrentTime(time));

    // Region events
    regions.on('region-updated', () => {
      // Collect all current timings
      const allRegions = regions.getRegions();
      const timings: Timing[] = allRegions.map((region) => ({
        sentenceId: region.id,
        startMs: Math.round(region.start * 1000),
        endMs: Math.round(region.end * 1000),
      }));
      onTimingsChange(timings);
    });

    regions.on('region-clicked', (region, e) => {
      e.stopPropagation();
      onSentenceSelect(region.id);
      region.play();
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [lessonId, sentences, onTimingsChange, onSentenceSelect]);

  // Update region colors when selection changes
  useEffect(() => {
    if (!regionsRef.current || !isReady) return;

    const regions = regionsRef.current.getRegions();
    regions.forEach((region, idx) => {
      const isSelected = region.id === selectedSentenceId;
      region.setOptions({
        color: isSelected ? SELECTED_COLOR : REGION_COLORS[idx % REGION_COLORS.length],
      });
    });
  }, [selectedSentenceId, isReady]);

  // Handle zoom changes
  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.zoom(zoom);
    }
  }, [zoom, isReady]);

  const handlePlayPause = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  }, []);

  const handlePlaySelected = useCallback(() => {
    if (!regionsRef.current || !selectedSentenceId) return;

    const regions = regionsRef.current.getRegions();
    const selectedRegion = regions.find((r) => r.id === selectedSentenceId);
    if (selectedRegion) {
      selectedRegion.play();
    }
  }, [selectedSentenceId]);

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
          Drag region edges to adjust boundaries. Click a region to select and play it.
        </p>
      </div>
    </div>
  );
}
