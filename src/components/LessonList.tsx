import { LessonCard } from '@/components/LessonCard';
import type { LessonWithTags } from '@/lib/db/lessons';

interface LessonListProps {
  lessons: LessonWithTags[];
}

export function LessonList({ lessons }: LessonListProps) {
  return (
    <div className="space-y-3">
      {lessons.map((lesson) => (
        <LessonCard key={lesson.id} lesson={lesson} />
      ))}
    </div>
  );
}
