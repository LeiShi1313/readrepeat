'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface TTSProvider {
  id: string;
  name: string;
  voices: string[];
  models: string[];
  defaultVoice: string;
  defaultModel: string;
  speakerModes?: string[];
  defaultSpeakerMode?: string;
  defaultDialogVoices?: string[];
}

interface TTSOptionsProps {
  lessonId: string;
  disabled?: boolean;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export function TTSOptions({ lessonId, disabled, onError, onSuccess }: TTSOptionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<TTSProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedVoice2, setSelectedVoice2] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [speakerMode, setSpeakerMode] = useState<'article' | 'dialog'>('article');

  useEffect(() => {
    fetch('/api/tts/config')
      .then((res) => res.json())
      .then((data) => {
        setProviders(data.providers || []);
        if (data.providers?.length > 0) {
          const provider = data.providers[0];
          setSelectedProvider(provider.id);
          setSelectedVoice(provider.defaultVoice);
          setSelectedModel(provider.defaultModel);
          setSpeakerMode(provider.defaultSpeakerMode || 'article');
          if (provider.defaultDialogVoices?.length >= 2) {
            setSelectedVoice(provider.defaultDialogVoices[0]);
            setSelectedVoice2(provider.defaultDialogVoices[1]);
          } else if (provider.voices?.length >= 2) {
            setSelectedVoice2(provider.voices[1]);
          }
        }
      })
      .catch(() => setProviders([]));
  }, []);

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setSelectedVoice(provider.defaultVoice);
      setSelectedModel(provider.defaultModel);
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

  const handleGenerate = async () => {
    if (!lessonId || !selectedVoice) return;

    setIsLoading(true);

    try {
      const res = await fetch(`/api/lessons/${lessonId}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          voiceName: selectedVoice,
          model: selectedModel,
          speakerMode,
          voice2Name: selectedVoice2,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate audio');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/lesson/${lessonId}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (onError) {
        onError(errorMsg);
      }
      setIsLoading(false);
    }
  };

  if (providers.length === 0) {
    return null;
  }

  const currentProvider = providers.find(p => p.id === selectedProvider) || providers[0];
  const isDisabled = disabled || isLoading;

  return (
    <div className="space-y-4">
      {/* Provider Selection - only show if multiple providers */}
      {providers.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            TTS Provider
          </label>
          <select
            value={selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            disabled={isDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {providers.map((provider) => (
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
              disabled={isDisabled}
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
              disabled={isDisabled}
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

      {/* Voice Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {speakerMode === 'dialog' ? 'Speaker 1 Voice' : 'Voice'}
        </label>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          disabled={isDisabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            disabled={isDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {currentProvider.voices.map((voice) => (
              <option key={voice} value={voice}>
                {voice}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isDisabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {currentProvider.models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* Generate Button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isDisabled}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-medium transition-colors',
          isDisabled
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
  );
}

export function useTTSAvailable() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    fetch('/api/tts/config')
      .then((res) => res.json())
      .then((data) => {
        setAvailable((data.providers?.length || 0) > 0);
      })
      .catch(() => setAvailable(false));
  }, []);

  return available;
}
