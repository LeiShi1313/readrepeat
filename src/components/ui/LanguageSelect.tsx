import { LANGUAGE_OPTIONS, LanguageCode } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface LanguageSelectProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function LanguageSelect({
  value,
  onChange,
  label,
  disabled,
  className,
}: LanguageSelectProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 border border-gray-300 rounded-lg',
          'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none',
          'text-gray-900 bg-white',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
