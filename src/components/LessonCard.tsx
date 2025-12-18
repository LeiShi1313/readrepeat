'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  status: string;
  foreignLang: string;
  translationLang: string;
  createdAt: string;
  errorMessage: string | null;
}

interface LessonCardProps {
  lesson: Lesson;
}

const STATUS_STYLES = {
  UPLOADED: 'bg-gray-100 text-gray-600',
  PROCESSING: 'bg-blue-100 text-blue-700',
  READY: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  UPLOADED: 'Awaiting Audio',
  PROCESSING: 'Processing',
  READY: 'Ready',
  FAILED: 'Failed',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function LessonCard({ lesson }: LessonCardProps) {
  const router = useRouter();
  const statusStyle = STATUS_STYLES[lesson.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.UPLOADED;
  const statusLabel = STATUS_LABELS[lesson.status as keyof typeof STATUS_LABELS] || lesson.status;

  const handleFineTuneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/lesson/${lesson.id}/fine-tune`);
  };

  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {lesson.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">
              {lesson.foreignLang.toUpperCase()} → {lesson.translationLang.toUpperCase()}
            </span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs text-gray-400">
              {formatDate(lesson.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lesson.status === 'READY' && (
            <button
              onClick={handleFineTuneClick}
              className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Fine-tune audio segments"
            >
              Fine-tune
            </button>
          )}
          <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusStyle)}>
            {statusLabel}
          </span>
        </div>
      </div>

      {lesson.status === 'FAILED' && lesson.errorMessage && (
        <p className="text-xs text-red-600 mt-2 truncate">
          {lesson.errorMessage}
        </p>
      )}

      {lesson.status === 'PROCESSING' && (
        <div className="mt-3">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      )}
    </Link>
  );
}
