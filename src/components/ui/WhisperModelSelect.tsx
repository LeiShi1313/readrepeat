import { WHISPER_MODEL_OPTIONS, WhisperModel } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface WhisperModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
}

export function WhisperModelSelect({
  value,
  onChange,
  disabled,
  hint,
  className,
}: WhisperModelSelectProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Whisper Model
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
        {WHISPER_MODEL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
