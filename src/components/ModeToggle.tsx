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
      className="inline-flex rounded-md bg-gray-100 p-0.5 cursor-pointer"
    >
      <span
        className={cn(
          'px-2 py-0.5 rounded text-xs font-medium transition-colors',
          mode === 'A'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500'
        )}
      >
        All
      </span>
      <span
        className={cn(
          'px-2 py-0.5 rounded text-xs font-medium transition-colors',
          mode === 'B'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500'
        )}
      >
        Hidden
      </span>
    </button>
  );
}
