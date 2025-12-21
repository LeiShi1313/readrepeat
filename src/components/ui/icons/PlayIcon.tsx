import { cn } from '@/lib/utils';

interface PlayIconProps {
  className?: string;
}

export function PlayIcon({ className }: PlayIconProps) {
  return (
    <svg className={cn('w-4 h-4', className)} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
