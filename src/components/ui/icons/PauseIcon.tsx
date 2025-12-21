import { cn } from '@/lib/utils';

interface PauseIconProps {
  className?: string;
}

export function PauseIcon({ className }: PauseIconProps) {
  return (
    <svg className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
    </svg>
  );
}
