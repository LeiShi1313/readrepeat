'use client';

import { cn } from '@/lib/utils';

export type PlayMode = 'A' | 'B';

interface ModeToggleProps {
  mode: PlayMode;
  onChange: (mode: PlayMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-md bg-gray-100 p-0.5">
      <button
        onClick={() => onChange('A')}
        className={cn(
          'px-2 py-0.5 rounded text-xs font-medium transition-colors',
          mode === 'A'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        All
      </button>
      <button
        onClick={() => onChange('B')}
        className={cn(
          'px-2 py-0.5 rounded text-xs font-medium transition-colors',
          mode === 'B'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        Hidden
      </button>
    </div>
  );
}
