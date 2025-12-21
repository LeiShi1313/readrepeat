'use client';

import { cn } from '@/lib/utils';
import type { PrimaryText } from '@/lib/atoms';

interface PrimaryTextToggleProps {
  primaryText: PrimaryText;
  onChange: (primaryText: PrimaryText) => void;
  foreignLang: string;
  translationLang: string;
}

export function PrimaryTextToggle({
  primaryText,
  onChange,
  foreignLang,
  translationLang,
}: PrimaryTextToggleProps) {
  const toggle = () => onChange(primaryText === 'foreign' ? 'translation' : 'foreign');

  const foreignLabel = foreignLang.toUpperCase();
  const translationLabel = translationLang.toUpperCase();

  return (
    <button
      onClick={toggle}
      className="relative inline-flex rounded-md bg-gray-100 p-0.5 cursor-pointer"
      title={`Primary: ${primaryText === 'foreign' ? foreignLabel : translationLabel}`}
    >
      {/* Sliding background */}
      <span
        className={cn(
          'absolute top-0.5 bottom-0.5 w-8 bg-white rounded shadow-sm transition-all duration-200 ease-out',
          primaryText === 'foreign' ? 'left-0.5' : 'left-[34px]'
        )}
      />
      {/* Labels */}
      <span
        className={cn(
          'relative z-10 w-8 text-center py-0.5 rounded text-xs font-medium transition-colors duration-200',
          primaryText === 'foreign' ? 'text-gray-900' : 'text-gray-500'
        )}
      >
        {foreignLabel}
      </span>
      <span
        className={cn(
          'relative z-10 w-8 text-center py-0.5 rounded text-xs font-medium transition-colors duration-200',
          primaryText === 'translation' ? 'text-gray-900' : 'text-gray-500'
        )}
      >
        {translationLabel}
      </span>
    </button>
  );
}
