import { cn } from '@/lib/utils';

interface CloseIconProps {
  className?: string;
}

export function CloseIcon({ className }: CloseIconProps) {
  return (
    <svg className={cn('w-5 h-5', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
