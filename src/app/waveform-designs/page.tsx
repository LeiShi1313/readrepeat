'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

// Sample audio URL - using a test tone or you can change this
const SAMPLE_AUDIO = '/api/media/sentences/test/clip';

interface WaveformDesign {
  name: string;
  description: string;
  config: Partial<Parameters<typeof WaveSurfer.create>[0]>;
}

const designs: WaveformDesign[] = [
  // === ACCURATE / HIGH-DETAIL DESIGNS ===
  {
    name: 'Design 1: High Resolution Line',
    description: 'Pixel-accurate continuous waveform, most detail',
    config: {
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      cursorColor: '#1e40af',
      cursorWidth: 1,
      height: 80,
      normalize: true,
      minPxPerSec: 50,
    },
  },
  {
    name: 'Design 2: Dense Micro Bars',
    description: '1px bars for maximum accuracy',
    config: {
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      cursorColor: '#1e40af',
      cursorWidth: 1,
      height: 80,
      barWidth: 1,
      barGap: 0,
      normalize: true,
      minPxPerSec: 50,
    },
  },
  {
    name: 'Design 3: Fine Bars',
    description: '1px bars with 1px gap, high detail',
    config: {
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      cursorColor: '#1e40af',
      cursorWidth: 1,
      height: 80,
      barWidth: 1,
      barGap: 1,
      normalize: true,
      minPxPerSec: 50,
    },
  },
  {
    name: 'Design 4: Detailed with Min Height',
    description: 'Shows quiet parts clearly with minimum bar height',
    config: {
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      cursorColor: '#1e40af',
      cursorWidth: 1,
      height: 80,
      barWidth: 1,
      barGap: 1,
      barMinHeight: 2,
      normalize: true,
      minPxPerSec: 50,
    },
  },
  {
    name: 'Design 5: Audio Editor Style',
    description: 'Classic DAW waveform look',
    config: {
      waveColor: '#22c55e',
      progressColor: '#16a34a',
      cursorColor: '#dc2626',
      cursorWidth: 1,
      height: 100,
      normalize: true,
      minPxPerSec: 80,
    },
  },
  {
    name: 'Design 6: Peaks & Valleys',
    description: 'Emphasizes dynamics, 2px bars no gap',
    config: {
      waveColor: '#6366f1',
      progressColor: '#4338ca',
      cursorColor: '#1e40af',
      cursorWidth: 1,
      height: 80,
      barWidth: 2,
      barGap: 0,
      normalize: true,
      minPxPerSec: 40,
    },
  },

  // === STYLIZED DESIGNS ===
  {
    name: 'Design A: Bars (Current)',
    description: 'Bar-style waveform with rounded corners',
    config: {
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      cursorColor: '#1e40af',
      cursorWidth: 2,
      height: 64,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
    },
  },
  {
    name: 'Design B: Thin Bars',
    description: 'Thinner bars with more gap',
    config: {
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      cursorColor: '#1e40af',
      cursorWidth: 2,
      height: 64,
      barWidth: 1,
      barGap: 2,
      barRadius: 1,
      normalize: true,
    },
  },
  {
    name: 'Design C: Wide Bars',
    description: 'Wider bars, no gap',
    config: {
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      cursorColor: '#1e40af',
      cursorWidth: 2,
      height: 64,
      barWidth: 4,
      barGap: 0,
      barRadius: 0,
      normalize: true,
    },
  },
  {
    name: 'Design D: Classic Line',
    description: 'Traditional continuous waveform line',
    config: {
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      cursorColor: '#1e40af',
      cursorWidth: 2,
      height: 64,
      normalize: true,
    },
  },
  {
    name: 'Design E: Gradient Bars',
    description: 'Bars with gradient colors',
    config: {
      waveColor: ['#3b82f6', '#8b5cf6', '#ec4899'],
      progressColor: ['#1d4ed8', '#6d28d9', '#be185d'],
      cursorColor: '#1e40af',
      cursorWidth: 2,
      height: 64,
      barWidth: 3,
      barGap: 1,
      barRadius: 3,
      normalize: true,
    },
  },
  {
    name: 'Design F: Minimal',
    description: 'Subtle, minimal appearance',
    config: {
      waveColor: '#94a3b8',
      progressColor: '#3b82f6',
      cursorColor: '#3b82f6',
      cursorWidth: 1,
      height: 48,
      barWidth: 1,
      barGap: 1,
      barRadius: 0,
      normalize: true,
    },
  },
  {
    name: 'Design G: Bold',
    description: 'Thick bars, high contrast',
    config: {
      waveColor: '#1e293b',
      progressColor: '#3b82f6',
      cursorColor: '#ef4444',
      cursorWidth: 3,
      height: 80,
      barWidth: 5,
      barGap: 2,
      barRadius: 5,
      normalize: true,
    },
  },
];

function WaveformPreview({ design, audioUrl, speed, zoom }: { design: WaveformDesign; audioUrl: string; speed: number; zoom: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsReady(false);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      ...design.config,
      minPxPerSec: zoom,
    } as Parameters<typeof WaveSurfer.create>[0]);

    wsRef.current = ws;

    ws.on('ready', () => {
      setIsReady(true);
      ws.setPlaybackRate(speed);
    });
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('error', (err) => setError(String(err)));

    ws.load(audioUrl);

    return () => {
      try {
        ws.destroy();
      } catch {
        // Ignore AbortError when component unmounts during load
      }
    };
  }, [design, audioUrl, zoom]);

  useEffect(() => {
    if (wsRef.current && isReady) {
      wsRef.current.setPlaybackRate(speed);
    }
  }, [speed, isReady]);

  const togglePlay = () => {
    if (wsRef.current) {
      if (isPlaying) {
        wsRef.current.pause();
      } else {
        wsRef.current.play();
      }
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-medium text-gray-900">{design.name}</h3>
          <p className="text-sm text-gray-500">{design.description}</p>
        </div>
        <button
          onClick={togglePlay}
          disabled={!isReady}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm rounded-lg transition-colors"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>

      <div ref={containerRef} className="bg-gray-50 rounded-lg overflow-hidden overflow-x-auto min-h-[64px]" />

      {!isReady && !error && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-500 mt-2">Error: {error}</div>
      )}
    </div>
  );
}

export default function WaveformDesignsPage() {
  const [audioUrl, setAudioUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(50);

  const adjustSpeed = (delta: number) => {
    setSpeed(s => Math.max(0.5, Math.min(2, Math.round((s + delta) * 10) / 10)));
  };

  const adjustZoom = (delta: number) => {
    setZoom(z => Math.max(10, Math.min(200, z + delta)));
  };

  // Try to get a real audio URL from localStorage or use a placeholder
  useEffect(() => {
    // Check if there's a lesson we can use
    fetch('/api/lessons')
      .then(res => res.json())
      .then(data => {
        if (data.lessons && data.lessons.length > 0) {
          const lesson = data.lessons[0];
          // Get sentences for this lesson
          fetch(`/api/lessons/${lesson.id}`)
            .then(res => res.json())
            .then(lessonData => {
              if (lessonData.sentences && lessonData.sentences.length > 0) {
                const sentence = lessonData.sentences[0];
                setAudioUrl(`/api/media/sentences/${sentence.id}/clip`);
              }
            });
        }
      })
      .catch(() => {
        // No lessons available
      });
  }, []);

  const handleSetUrl = () => {
    if (customUrl) {
      setAudioUrl(customUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Waveform Design Options</h1>
        <p className="text-gray-600 mb-6">Compare different waveform visualizations. Pick your favorite!</p>

        {/* Global Controls */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm sticky top-4 z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Audio URL input */}
            <div className="flex-1 min-w-[250px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Audio URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="/api/media/sentences/{id}/clip"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSetUrl}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-sm rounded-lg transition-colors"
                >
                  Set
                </button>
              </div>
              {audioUrl && (
                <p className="mt-1 text-xs text-gray-400 truncate">Current: {audioUrl}</p>
              )}
            </div>

            {/* Speed control */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Speed</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjustSpeed(-0.1)}
                  disabled={speed <= 0.5}
                  className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 border border-gray-200 rounded text-gray-600 text-sm font-medium"
                >
                  −
                </button>
                <span className="text-sm text-gray-700 w-12 text-center tabular-nums font-medium">
                  {speed.toFixed(1)}x
                </span>
                <button
                  onClick={() => adjustSpeed(0.1)}
                  disabled={speed >= 2}
                  className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 border border-gray-200 rounded text-gray-600 text-sm font-medium"
                >
                  +
                </button>
              </div>
            </div>

            {/* Zoom control */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Zoom</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjustZoom(-10)}
                  disabled={zoom <= 10}
                  className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 border border-gray-200 rounded text-gray-600 text-sm font-medium"
                >
                  −
                </button>
                <span className="text-sm text-gray-700 w-10 text-center tabular-nums font-medium">
                  {zoom}
                </span>
                <button
                  onClick={() => adjustZoom(10)}
                  disabled={zoom >= 200}
                  className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 border border-gray-200 rounded text-gray-600 text-sm font-medium"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Waveform previews */}
        {audioUrl ? (
          <div className="grid gap-4">
            {designs.map((design, index) => (
              <WaveformPreview key={index} design={design} audioUrl={audioUrl} speed={speed} zoom={zoom} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">No audio available. Please create a lesson first or enter a custom URL above.</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">How to choose:</h3>
          <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
            <li>Play each waveform to see how it animates during playback</li>
            <li>Consider readability on mobile devices</li>
            <li>Note which style best shows the audio dynamics</li>
            <li>Tell me which design letter you prefer (A-H)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
