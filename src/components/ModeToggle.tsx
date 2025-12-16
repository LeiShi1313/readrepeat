'use client';

import { cn } from '@/lib/utils';

export type PlayMode = 'A' | 'B';

interface ModeToggleProps {
  mode: PlayMode;
  onChange: (mode: PlayMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const toggle = () => onChange(mode === 'A' ? 'B' : 'A');

  return (
    <button
      onClick={toggle}
      className="relative inline-flex rounded-md bg-gray-100 p-0.5 cursor-pointer"
    >
      {/* Sliding background */}
      <span
        className={cn(
          'absolute top-0.5 bottom-0.5 bg-white rounded shadow-sm transition-all duration-200 ease-out',
          mode === 'A' ? 'left-0.5 w-10' : 'left-[42px] w-14'
        )}
      />
      {/* Labels */}
      <span
        className={cn(
          'relative z-10 w-10 text-center py-0.5 rounded text-xs font-medium transition-colors duration-200',
          mode === 'A' ? 'text-gray-900' : 'text-gray-500'
        )}
      >
        All
      </span>
      <span
        className={cn(
          'relative z-10 w-14 text-center py-0.5 rounded text-xs font-medium transition-colors duration-200',
          mode === 'B' ? 'text-gray-900' : 'text-gray-500'
        )}
      >
        Hidden
      </span>
    </button>
  );
}
