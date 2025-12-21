'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { cn, hasSpeakerTags, stripSpeakerTags } from '@/lib/utils';
import { foreignLangAtom, translationLangAtom, whisperModelAtom } from '@/lib/atoms';
import { TTSOptions } from './TTSOptions';
import { TranscribeButton } from './TranscribeButton';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { LanguageSelect } from './ui/LanguageSelect';
import { WhisperModelSelect } from './ui/WhisperModelSelect';
import { AudioDropzone } from './form/AudioDropzone';
import { AudioModeTabs, AudioMode } from './form/AudioModeTabs';
import { useTranslationConfig } from '@/hooks/useTranslationConfig';
import { useTTSConfig } from '@/hooks/useTTSConfig';
import { Dialog, DialogHeader, DialogContent, DialogFooter, DialogCancelButton, DialogConfirmButton } from './ui/Dialog';

export function UploadForm() {
  const router = useRouter();
  const [step, setStep] = useState<'text' | 'audio'>('text');
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [foreignText, setForeignText] = useState('');
  const [translationText, setTranslationText] = useState('');
  const [foreignLang, setForeignLang] = useAtom(foreignLangAtom);
  const [translationLang, setTranslationLang] = useAtom(translationLangAtom);
  const [whisperModel, setWhisperModel] = useAtom(whisperModelAtom);

  const [audioMode, setAudioMode] = useState<AudioMode>('upload');
  const [transcribedAudioFileId, setTranscribedAudioFileId] = useState<string | null>(null);
  const [isDialog, setIsDialog] = useState(false);

  // Dialog detection state
  const [showDialogConfirm, setShowDialogConfirm] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const previousTextRef = useRef('');

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

  // Handle foreign text change - detect pasted dialog text
  const handleForeignTextChange = (newText: string) => {
    const wasEmpty = !previousTextRef.current.trim();
    const isPaste = wasEmpty && newText.length > 50; // Likely a paste if going from empty to substantial text

    if (isPaste && !isDialog && hasSpeakerTags(newText)) {
      // Show confirmation dialog
      setPendingText(newText);
      setShowDialogConfirm(true);
    } else {
      setForeignText(newText);
    }
    previousTextRef.current = newText;
  };

  // Handle dialog mode confirmation
  const handleConfirmDialog = () => {
    setForeignText(stripSpeakerTags(pendingText));
    setIsDialog(true);
    setShowDialogConfirm(false);
    setPendingText('');
  };

  const handleDenyDialog = () => {
    setForeignText(pendingText);
    setShowDialogConfirm(false);
    setPendingText('');
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || undefined,
          foreignText,
          translationText,
          foreignLang,
          translationLang,
          whisperModel,
          isDialog,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create lesson');
      }

      const data = await res.json();
      setLessonId(data.id);
      if (transcribedAudioFileId) {
        setAudioMode('transcribed');
      }
      setStep('audio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTranscribedAudio = async () => {
    if (!lessonId || !transcribedAudioFileId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/lessons/${lessonId}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioFileId: transcribedAudioFileId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to use transcribed audio');
      }

      router.push(`/lesson/${lessonId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const handleAudioUpload = async (file: File) => {
    if (!lessonId) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const res = await fetch(`/api/lessons/${lessonId}/audio`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload audio');
      }

      router.push(`/lesson/${lessonId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  if (step === 'audio') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => setStep('text')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to text
          </button>
        </div>

        <h2 className="text-2xl font-bold mb-2">Add Audio</h2>
        <p className="text-gray-600 mb-6">
          Upload an audio file or generate with TTS.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <AudioModeTabs
          activeMode={audioMode}
          onModeChange={setAudioMode}
          showTTS={ttsAvailable}
          showTranscribed={!!transcribedAudioFileId}
        />

        {audioMode === 'upload' && (
          <AudioDropzone
            onUpload={handleAudioUpload}
            onError={setError}
            isLoading={isLoading}
          />
        )}

        {audioMode === 'tts' && lessonId && (
          <TTSOptions
            lessonId={lessonId}
            isDialog={isDialog}
            disabled={isLoading}
            onError={setError}
          />
        )}

        {audioMode === 'transcribed' && transcribedAudioFileId && (
          <div className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-green-800 mb-2">Transcribed Audio Available</h3>
            <p className="text-sm text-green-700 mb-4">
              Use the audio file you uploaded for transcription. No need to upload again.
            </p>
            <button
              onClick={handleUseTranscribedAudio}
              disabled={isLoading}
              className={cn(
                'px-6 py-3 rounded-lg font-medium transition-colors',
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="md" />
                  Processing...
                </span>
              ) : (
                'Use Transcribed Audio'
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleTextSubmit} className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Create New Lesson</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Lesson Title <span className="text-gray-500">(optional)</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Auto-generated from first sentence if empty"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <LanguageSelect
          value={foreignLang}
          onChange={setForeignLang}
          label="Foreign Language"
        />
        <LanguageSelect
          value={translationLang}
          onChange={setTranslationLang}
          label="Translation Language"
        />
      </div>

      <WhisperModelSelect
        value={whisperModel}
        onChange={setWhisperModel}
        hint="Larger models are more accurate but slower to process"
      />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Foreign Text <span className="text-red-500">*</span>
          </label>
          <TranscribeButton
            onTranscribed={(text, audioFileId) => {
              setForeignText(text);
              setTranscribedAudioFileId(audioFileId);
            }}
            whisperModel={whisperModel}
          />
        </div>
        <textarea
          value={foreignText}
          onChange={(e) => handleForeignTextChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-40 resize-none text-gray-900 placeholder:text-gray-400"
          placeholder="Paste the paragraph in the foreign language here..."
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          This is the text that will be read in the audio file
        </p>
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isDialog}
            onChange={(e) => setIsDialog(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Dialog mode (2 speakers)</span>
        </label>
        {isDialog && (
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Each line alternates between two speakers
          </p>
        )}
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
                  disabled={isTranslating}
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
                disabled={isTranslating || !foreignText.trim()}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors',
                  isTranslating || !foreignText.trim()
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-40 resize-none text-gray-900 placeholder:text-gray-400"
          placeholder="Paste the translation here..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !foreignText || !translationText}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-medium transition-colors',
          isLoading || !foreignText || !translationText
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size="md" />
            Creating...
          </span>
        ) : (
          'Continue to Audio Upload'
        )}
      </button>

      {/* Dialog detection confirmation */}
      <Dialog open={showDialogConfirm} onClose={handleDenyDialog} maxWidth="md">
        <DialogHeader
          title="Dialog Detected"
          description="The pasted text contains speaker tags (e.g., 'Speaker 1:', 'Speaker 2:'). Would you like to enable dialog mode?"
        />
        <DialogContent>
          <p className="text-sm text-gray-600">
            If you confirm, the speaker tags will be removed and dialog mode will be enabled.
            Each line will alternate between two speakers during TTS generation.
          </p>
        </DialogContent>
        <DialogFooter>
          <DialogCancelButton onClick={handleDenyDialog}>Keep as is</DialogCancelButton>
          <DialogConfirmButton onClick={handleConfirmDialog}>
            Enable Dialog Mode
          </DialogConfirmButton>
        </DialogFooter>
      </Dialog>
    </form>
  );
}
