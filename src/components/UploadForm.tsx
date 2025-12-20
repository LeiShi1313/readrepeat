'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { cn } from '@/lib/utils';
import { foreignLangAtom, translationLangAtom, whisperModelAtom } from '@/lib/atoms';

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'text' | 'audio'>('text');
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [title, setTitle] = useState('');
  const [foreignText, setForeignText] = useState('');
  const [translationText, setTranslationText] = useState('');
  const [foreignLang, setForeignLang] = useAtom(foreignLangAtom);
  const [translationLang, setTranslationLang] = useAtom(translationLangAtom);
  const [whisperModel, setWhisperModel] = useAtom(whisperModelAtom);
  const [translateProviders, setTranslateProviders] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

  // TTS state
  const [ttsProviders, setTtsProviders] = useState<Array<{
    id: string;
    name: string;
    voices: string[];
    models: string[];
    defaultVoice: string;
    defaultModel: string;
    speakerModes?: string[];
    defaultSpeakerMode?: string;
    defaultDialogVoices?: string[];
  }>>([]);
  const [audioMode, setAudioMode] = useState<'upload' | 'tts'>('upload');
  const [selectedTtsProvider, setSelectedTtsProvider] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedTtsModel, setSelectedTtsModel] = useState<string>('');
  const [speakerMode, setSpeakerMode] = useState<'article' | 'dialog'>('article');
  const [selectedVoice2, setSelectedVoice2] = useState<string>('');

  useEffect(() => {
    // Fetch translation config
    fetch('/api/translate/config')
      .then((res) => res.json())
      .then((data) => {
        setTranslateProviders(data.providers || []);
        if (data.providers?.length > 0) {
          setSelectedProvider(data.providers[0].id);
        }
      })
      .catch(() => setTranslateProviders([]));

    // Fetch TTS config
    fetch('/api/tts/config')
      .then((res) => res.json())
      .then((data) => {
        setTtsProviders(data.providers || []);
        if (data.providers?.length > 0) {
          const provider = data.providers[0];
          setSelectedTtsProvider(provider.id);
          setSelectedVoice(provider.defaultVoice);
          setSelectedTtsModel(provider.defaultModel);
          setSpeakerMode(provider.defaultSpeakerMode || 'article');
          // Set default dialog voices
          if (provider.defaultDialogVoices?.length >= 2) {
            setSelectedVoice(provider.defaultDialogVoices[0]);
            setSelectedVoice2(provider.defaultDialogVoices[1]);
          } else if (provider.voices?.length >= 2) {
            setSelectedVoice2(provider.voices[1]);
          }
        }
      })
      .catch(() => setTtsProviders([]));
  }, []);

  const handleTranslate = async () => {
    if (!foreignText.trim() || !selectedProvider) return;

    setIsTranslating(true);
    setError(null);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: foreignText,
          sourceLang: foreignLang,
          targetLang: translationLang,
          provider: selectedProvider,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Translation failed');
      }

      const data = await res.json();
      setTranslationText(data.translatedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create lesson');
      }

      const data = await res.json();
      setLessonId(data.id);
      setStep('audio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
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

      // Redirect to lesson page
      router.push(`/lesson/${lessonId}`);
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

  const handleTtsProviderChange = (providerId: string) => {
    setSelectedTtsProvider(providerId);
    const provider = ttsProviders.find(p => p.id === providerId);
    if (provider) {
      setSelectedVoice(provider.defaultVoice);
      setSelectedTtsModel(provider.defaultModel);
      setSpeakerMode(provider.defaultSpeakerMode as 'article' | 'dialog' || 'article');
      const dialogVoices = provider.defaultDialogVoices;
      if (dialogVoices && dialogVoices.length >= 2) {
        setSelectedVoice(dialogVoices[0]);
        setSelectedVoice2(dialogVoices[1]);
      } else if (provider.voices?.length >= 2) {
        setSelectedVoice2(provider.voices[1]);
      }
    }
  };

  const handleTtsGenerate = async () => {
    if (!lessonId || !selectedVoice) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/lessons/${lessonId}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedTtsProvider,
          voiceName: selectedVoice,
          model: selectedTtsModel,
          speakerMode,
          voice2Name: selectedVoice2,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate audio');
      }

      // Redirect to lesson page (will show processing status)
      router.push(`/lesson/${lessonId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
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

  if (step === 'audio') {
    const ttsAvailable = ttsProviders.length > 0;
    const currentProvider = ttsProviders.find(p => p.id === selectedTtsProvider) || ttsProviders[0];

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

        {/* Mode tabs - only show if TTS is available */}
        {ttsAvailable && (
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => setAudioMode('upload')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                audioMode === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Upload Audio
            </button>
            <button
              type="button"
              onClick={() => setAudioMode('tts')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                audioMode === 'tts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Generate with TTS
            </button>
          </div>
        )}

        {/* Upload mode */}
        {audioMode === 'upload' && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
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
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <span className="font-medium">Click or drag to upload audio file</span>
                </>
              )}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Supported formats: MP3, WAV, M4A, OGG, WEBM
            </div>
          </div>
        )}

        {/* TTS mode */}
        {audioMode === 'tts' && currentProvider && (
          <div className="space-y-4">
            {/* Provider Selection - only show if multiple providers */}
            {ttsProviders.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TTS Provider
                </label>
                <select
                  value={selectedTtsProvider}
                  onChange={(e) => handleTtsProviderChange(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
                >
                  {ttsProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speaker Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speaker Mode
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="speakerMode"
                    value="article"
                    checked={speakerMode === 'article'}
                    onChange={() => setSpeakerMode('article')}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Article (1 speaker)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="speakerMode"
                    value="dialog"
                    checked={speakerMode === 'dialog'}
                    onChange={() => setSpeakerMode('dialog')}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Dialog (2 speakers)</span>
                </label>
              </div>
              {speakerMode === 'dialog' && (
                <p className="text-xs text-gray-500 mt-1">
                  Use &quot;Speaker 1:&quot; and &quot;Speaker 2:&quot; tags at the start of lines to specify speakers
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {speakerMode === 'dialog' ? 'Speaker 1 Voice' : 'Voice'}
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
              >
                {currentProvider.voices.map((voice) => (
                  <option key={voice} value={voice}>
                    {voice}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker 2 Voice - only shown in dialog mode */}
            {speakerMode === 'dialog' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Speaker 2 Voice
                </label>
                <select
                  value={selectedVoice2}
                  onChange={(e) => setSelectedVoice2(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
                >
                  {currentProvider.voices.map((voice) => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={selectedTtsModel}
                onChange={(e) => setSelectedTtsModel(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
              >
                {currentProvider.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleTtsGenerate}
              disabled={isLoading}
              className={cn(
                'w-full py-3 px-4 rounded-lg font-medium transition-colors',
                isLoading
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
                  Generating...
                </span>
              ) : (
                'Generate Audio'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Powered by {currentProvider.name}
            </p>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Foreign Language
          </label>
          <select
            value={foreignLang}
            onChange={(e) => setForeignLang(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
        >
          <option value="tiny">Tiny (39MB) - Fastest, lower accuracy</option>
          <option value="base">Base (74MB) - Fast, good accuracy</option>
          <option value="small">Small (244MB) - Balanced</option>
          <option value="medium">Medium (769MB) - Slower, high accuracy</option>
          <option value="large-v3">Large-v3 (3GB) - Slowest, highest accuracy</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Larger models are more accurate but slower to process
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Foreign Text <span className="text-red-500">*</span>
        </label>
        <textarea
          value={foreignText}
          onChange={(e) => setForeignText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-40 resize-none text-gray-900 placeholder:text-gray-400"
          placeholder="Paste the paragraph in the foreign language here..."
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          This is the text that will be read in the audio file
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
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
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
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating...
          </span>
        ) : (
          'Continue to Audio Upload'
        )}
      </button>
    </form>
  );
}
