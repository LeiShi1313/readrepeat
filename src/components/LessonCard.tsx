import Link from 'next/link';
import { cn, formatDate, type TagInfo } from '@/lib/utils';
import { TagBadge } from './ui/TagBadge';

interface Lesson {
  id: string;
  title: string;
  status: string;
  foreignLang: string;
  translationLang: string;
  createdAt: string;
  errorMessage: string | null;
  tags?: TagInfo[];
}

interface LessonCardProps {
  lesson: Lesson;
}

const STATUS_STYLES = {
  UPLOADED: 'bg-gray-100 text-gray-600',
  PROCESSING: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  UPLOADED: 'Awaiting Audio',
  PROCESSING: 'Processing',
  FAILED: 'Failed',
};

export function LessonCard({ lesson }: LessonCardProps) {
  const statusStyle = STATUS_STYLES[lesson.status as keyof typeof STATUS_STYLES];
  const statusLabel = STATUS_LABELS[lesson.status as keyof typeof STATUS_LABELS];

  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {lesson.status === 'READY' && (
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Ready" />
            )}
            <h3 className="font-medium text-gray-900 truncate">
              {lesson.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">
              {lesson.foreignLang.toUpperCase()} → {lesson.translationLang.toUpperCase()}
            </span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs text-gray-400">
              {formatDate(lesson.createdAt)}
            </span>
          </div>
          {lesson.tags && lesson.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {lesson.tags.slice(0, 3).map((tag) => (
                <TagBadge key={tag.id} name={tag.displayName} />
              ))}
              {lesson.tags.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{lesson.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        {statusLabel && (
          <span className={cn('text-xs px-2 py-1 rounded-full font-medium flex-shrink-0', statusStyle)}>
            {statusLabel}
          </span>
        )}
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
