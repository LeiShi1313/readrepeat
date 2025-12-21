'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EditLessonForm } from '@/components/EditLessonForm';
import { TTSOptions } from '@/components/TTSOptions';
import { AudioDropzone } from '@/components/form/AudioDropzone';
import { AudioModeTabs, AudioMode } from '@/components/form/AudioModeTabs';
import { useTTSConfig } from '@/hooks/useTTSConfig';
import { useLessonDelete } from '@/hooks/useLessonDelete';
import { useLessonReprocess } from '@/hooks/useLessonReprocess';
import { useAudioUpload } from '@/hooks/useAudioUpload';

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
}

interface FailedViewProps {
  lesson: Lesson;
}

export function FailedView({ lesson }: FailedViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAudioOptions, setShowAudioOptions] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioMode>('upload');
  const [error, setError] = useState<string | null>(null);

  const { ttsAvailable } = useTTSConfig();
  const { deleteLesson, isDeleting } = useLessonDelete(lesson.id, {
    onSuccess: () => setShowDeleteConfirm(false),
    onError: (err) => alert(err),
  });
  const { reprocess, error: reprocessError } = useLessonReprocess(lesson.id, {
    onError: setError,
  });
  const { uploadAudio, isUploading } = useAudioUpload(lesson.id, {
    onError: setError,
  });

  const hasAudio = !!lesson.audioOriginalPath;
  const displayError = error || reprocessError;

  const handleTryAgain = async () => {
    if (hasAudio) {
      reprocess();
    } else {
      setShowAudioOptions(true);
    }
  };

  if (isEditing) {
    return <EditLessonForm lesson={lesson} onCancel={() => setIsEditing(false)} />;
  }

  // Show audio options when there's no audio file
  if (showAudioOptions) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={() => setShowAudioOptions(false)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>

          <h2 className="text-2xl font-bold mb-2">Add Audio</h2>
          <p className="text-gray-600 mb-6">
            Upload an audio file or generate with TTS to retry processing.
          </p>

          {displayError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
              {displayError}
            </div>
          )}

          <AudioModeTabs
            activeMode={audioMode}
            onModeChange={setAudioMode}
            showTTS={ttsAvailable}
          />

          {audioMode === 'upload' && (
            <AudioDropzone
              onUpload={uploadAudio}
              onError={setError}
              isLoading={isUploading}
            />
          )}

          {audioMode === 'tts' && (
            <TTSOptions
              lessonId={lesson.id}
              isDialog={!!lesson.isDialog}
              disabled={isUploading}
              onError={setError}
              onSuccess={() => router.refresh()}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Processing Failed</h2>
        <p className="text-gray-600 mb-4">
          {lesson.errorMessage || 'An error occurred while processing the audio.'}
        </p>

        {displayError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-sm">
            {displayError}
          </div>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Home
          </Link>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
          <button
            onClick={handleTryAgain}
            className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Lesson?</h3>
            <p className="text-gray-600 mb-4">
              This will permanently delete &quot;{lesson.title || 'Untitled'}&quot; and all associated audio files. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteLesson}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
