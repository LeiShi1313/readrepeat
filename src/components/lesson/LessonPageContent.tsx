'use client';

import { useState, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { Player } from './Player';
import { EditLessonForm } from '@/components/EditLessonForm';
import { LessonHeader } from './LessonHeader';
import {
  lessonPrimaryTextAtomFamily,
  lessonPlaybackSpeedAtomFamily,
  lessonRevealAllAtomFamily,
} from '@/lib/atoms';
import { useAudioCache } from '@/hooks/useAudioCache';
import type { TagInfo } from '@/lib/utils';

interface Sentence {
  id: string;
  lessonId: string;
  idx: number;
  foreignText: string;
  translationText: string;
  startMs: number | null;
  endMs: number | null;
  clipPath: string | null;
  confidence: number | null;
}

interface Lesson {
  id: string;
  title: string | null;
  foreignTextRaw: string;
  translationTextRaw: string;
  foreignLang: string;
  translationLang: string;
  whisperModel: string;
  isDialog: number;
  status: string;
  errorMessage: string | null;
  audioOriginalPath: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: TagInfo[];
}

interface LessonPageContentProps {
  lesson: Lesson;
  sentences: Sentence[];
}

export function LessonPageContent({ lesson, sentences }: LessonPageContentProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Per-lesson settings (persisted to localStorage)
  const primaryTextAtom = useMemo(() => lessonPrimaryTextAtomFamily(lesson.id), [lesson.id]);
  const playbackSpeedAtom = useMemo(() => lessonPlaybackSpeedAtomFamily(lesson.id), [lesson.id]);
  const revealAllAtom = useMemo(() => lessonRevealAllAtomFamily(lesson.id), [lesson.id]);

  const primaryText = useAtomValue(primaryTextAtom);
  const playbackSpeed = useAtomValue(playbackSpeedAtom);
  const revealAll = useAtomValue(revealAllAtom);

  // Audio cache (lifted up so header can show download indicator)
  const clipUrls = useMemo(
    () => sentences.map((s) => `/api/media/sentences/${s.id}/clip`),
    [sentences]
  );
  const { cached, total, isDownloading, isAllCached, cacheAudio, cacheAllAudio } =
    useAudioCache(clipUrls);

  if (isEditing) {
    return <EditLessonForm lesson={lesson} onCancel={() => setIsEditing(false)} />;
  }

  const title = lesson.title || 'Untitled';

  return (
    <div className="min-h-screen bg-white">
      <LessonHeader
        lessonId={lesson.id}
        title={title}
        foreignLang={lesson.foreignLang}
        translationLang={lesson.translationLang}
        onEdit={() => setIsEditing(true)}
      />

      <main>
        <Player
          lesson={{ ...lesson, title, sentences, tags: lesson.tags }}
          primaryText={primaryText}
          playbackSpeed={playbackSpeed}
          revealAll={revealAll}
          cached={cached}
          total={total}
          isDownloading={isDownloading}
          isAllCached={isAllCached}
          onDownloadAll={cacheAllAudio}
          onCacheAudio={cacheAudio}
        />
      </main>
    </div>
  );
}
