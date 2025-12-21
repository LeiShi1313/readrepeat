import { adjustSpeed } from '@/lib/utils';

interface SpeedControlProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export function SpeedControl({ speed, onSpeedChange }: SpeedControlProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onSpeedChange(adjustSpeed(speed, -0.1))}
        disabled={speed <= 0.5}
        className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 border border-gray-200 rounded text-gray-600 text-xs font-medium"
      >
        −
      </button>
      <span className="text-xs text-gray-600 w-8 text-center tabular-nums">
        {speed.toFixed(1)}x
      </span>
      <button
        onClick={() => onSpeedChange(adjustSpeed(speed, 0.1))}
        disabled={speed >= 2}
        className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 border border-gray-200 rounded text-gray-600 text-xs font-medium"
      >
        +
      </button>
    </div>
  );
}
