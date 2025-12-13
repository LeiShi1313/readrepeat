'use client';

import { cn } from '@/lib/utils';

export type PlayMode = 'A' | 'B';

interface ModeToggleProps {
  mode: PlayMode;
  onChange: (mode: PlayMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1">
      <button
        onClick={() => onChange('A')}
        className={cn(
          'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          mode === 'A'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        Reveal All
      </button>
      <button
        onClick={() => onChange('B')}
        className={cn(
          'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          mode === 'B'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        Translation First
      </button>
    </div>
  );
}
