'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string | null;
  foreignTextRaw: string;
  translationTextRaw: string;
  foreignLang: string;
  translationLang: string;
  whisperModel: string;
}

interface EditLessonFormProps {
  lesson: Lesson;
  onCancel: () => void;
}

export function EditLessonForm({ lesson, onCancel }: EditLessonFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [title, setTitle] = useState(lesson.title || '');
  const [foreignText, setForeignText] = useState(lesson.foreignTextRaw);
  const [translationText, setTranslationText] = useState(lesson.translationTextRaw);
  const [foreignLang, setForeignLang] = useState(lesson.foreignLang);
  const [translationLang, setTranslationLang] = useState(lesson.translationLang);
  const [whisperModel, setWhisperModel] = useState(lesson.whisperModel);

  const hasChanges =
    foreignText !== lesson.foreignTextRaw ||
    translationText !== lesson.translationTextRaw ||
    title !== (lesson.title || '') ||
    foreignLang !== lesson.foreignLang ||
    translationLang !== lesson.translationLang ||
    whisperModel !== lesson.whisperModel;

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || null,
          foreignText,
          translationText,
          foreignLang,
          translationLang,
          whisperModel,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update lesson');
      }

      const data = await res.json();

      if (data.reprocessing) {
        // Refresh page to show processing status
        router.refresh();
      } else {
        // Just go back to viewer
        onCancel();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const handleAudioUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const res = await fetch(`/api/lessons/${lesson.id}/audio`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload audio');
      }

      // Refresh page to show processing status
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAudioUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      handleAudioUpload(file);
    } else {
      setError('Please upload an audio file');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          disabled={isLoading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Cancel editing
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-6">Edit Lesson</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleTextSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lesson Title <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Auto-generated from first sentence if empty"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foreign Language
            </label>
            <select
              value={foreignLang}
              onChange={(e) => setForeignLang(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={isLoading}
            >
              <option value="en">English</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Translation Language
            </label>
            <select
              value={translationLang}
              onChange={(e) => setTranslationLang(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={isLoading}
            >
              <option value="zh">Chinese</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Whisper Model
          </label>
          <select
            value={whisperModel}
            onChange={(e) => setWhisperModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={isLoading}
          >
            <option value="tiny">Tiny (39MB) - Fastest, lower accuracy</option>
            <option value="base">Base (74MB) - Fast, good accuracy</option>
            <option value="small">Small (244MB) - Balanced</option>
            <option value="medium">Medium (769MB) - Slower, high accuracy</option>
            <option value="large-v3">Large-v3 (3GB) - Slowest, highest accuracy</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Changing the model will trigger re-processing
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Foreign Text <span className="text-red-500">*</span>
          </label>
          <textarea
            value={foreignText}
            onChange={(e) => setForeignText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-40 resize-none"
            placeholder="Paste the paragraph in the foreign language here..."
            required
            disabled={isLoading}
          />
          <p className="text-xs text-gray-400 mt-1">
            Changing text will trigger re-alignment with the audio
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Translation Text <span className="text-red-500">*</span>
          </label>
          <textarea
            value={translationText}
            onChange={(e) => setTranslationText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-40 resize-none"
            placeholder="Paste the translation here..."
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !foreignText || !translationText || !hasChanges}
          className={cn(
            'w-full py-3 px-4 rounded-lg font-medium transition-colors',
            isLoading || !foreignText || !translationText || !hasChanges
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t">
        <h3 className="text-lg font-semibold mb-4">Replace Audio</h3>
        <p className="text-gray-600 mb-4">
          Upload a new audio file to replace the current one. This will trigger re-processing.
        </p>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isLoading
              ? 'cursor-not-allowed bg-gray-50'
              : 'cursor-pointer',
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
          />
          <div className="text-gray-600">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </div>
            ) : (
              <>
                <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="font-medium">Click or drag to upload new audio</span>
              </>
            )}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            MP3, WAV, M4A, OGG, WEBM
          </div>
        </div>
      </div>
    </div>
  );
}
