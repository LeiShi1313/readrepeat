import { cn } from '@/lib/utils';

interface StopIconProps {
  className?: string;
}

export function StopIcon({ className }: StopIconProps) {
  return (
    <svg className={cn('w-4 h-4', className)} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}
