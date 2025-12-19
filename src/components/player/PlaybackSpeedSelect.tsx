'use client';

interface PlaybackSpeedSelectProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

const SPEED_OPTIONS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

export function PlaybackSpeedSelect({ playbackRate, onPlaybackRateChange }: PlaybackSpeedSelectProps) {
  return (
    <select
      value={playbackRate}
      onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white"
    >
      {SPEED_OPTIONS.map((speed) => (
        <option key={speed} value={speed}>
          {speed}x
        </option>
      ))}
    </select>
  );
}
