'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TTSOptions } from './TTSOptions';
import { TranscribeButton } from './TranscribeButton';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { LanguageSelect } from './ui/LanguageSelect';
import { WhisperModelSelect } from './ui/WhisperModelSelect';
import { AudioDropzone } from './form/AudioDropzone';
import { AudioModeTabs, AudioMode } from './form/AudioModeTabs';
import { useTranslationConfig } from '@/hooks/useTranslationConfig';
import { useTTSConfig } from '@/hooks/useTTSConfig';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(lesson.title || '');
  const [foreignText, setForeignText] = useState(lesson.foreignTextRaw);
  const [translationText, setTranslationText] = useState(lesson.translationTextRaw);
  const [foreignLang, setForeignLang] = useState(lesson.foreignLang);
  const [translationLang, setTranslationLang] = useState(lesson.translationLang);
  const [whisperModel, setWhisperModel] = useState(lesson.whisperModel);

  const [audioMode, setAudioMode] = useState<AudioMode>('upload');

  const { ttsAvailable } = useTTSConfig();

  const {
    providers: translateProviders,
    selectedProvider,
    setSelectedProvider,
    isTranslating,
    translate,
  } = useTranslationConfig({
    sourceLang: foreignLang,
    targetLang: translationLang,
    onTranslated: setTranslationText,
    onError: setError,
  });

  const handleTranslate = () => translate(foreignText);

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
        router.refresh();
      } else {
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

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
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
          <LanguageSelect
            value={foreignLang}
            onChange={setForeignLang}
            label="Foreign Language"
            disabled={isLoading}
          />
          <LanguageSelect
            value={translationLang}
            onChange={setTranslationLang}
            label="Translation Language"
            disabled={isLoading}
          />
        </div>

        <WhisperModelSelect
          value={whisperModel}
          onChange={setWhisperModel}
          disabled={isLoading}
          hint="Changing the model will trigger re-processing"
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Foreign Text <span className="text-red-500">*</span>
            </label>
            <TranscribeButton
              onTranscribed={setForeignText}
              whisperModel={whisperModel}
              disabled={isLoading}
            />
          </div>
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Translation Text <span className="text-red-500">*</span>
            </label>
            {translateProviders.length > 0 && (
              <div className="flex items-center gap-2">
                {translateProviders.length > 1 && (
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    disabled={isTranslating || isLoading}
                    className="text-xs px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {translateProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={isTranslating || isLoading || !foreignText.trim()}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors',
                    isTranslating || isLoading || !foreignText.trim()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  )}
                >
                  {isTranslating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      {translateProviders.length === 1 ? `Translate (${translateProviders[0].name})` : 'Translate'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
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
              <LoadingSpinner size="md" />
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
          Upload a new audio file or generate with TTS. This will trigger re-processing.
        </p>

        <AudioModeTabs
          activeMode={audioMode}
          onModeChange={setAudioMode}
          showTTS={ttsAvailable}
        />

        {audioMode === 'upload' && (
          <AudioDropzone
            onUpload={handleAudioUpload}
            onError={setError}
            isLoading={isLoading}
          />
        )}

        {audioMode === 'tts' && (
          <TTSOptions
            lessonId={lesson.id}
            disabled={isLoading}
            onError={setError}
            onSuccess={() => router.refresh()}
          />
        )}
      </div>
    </div>
  );
}
