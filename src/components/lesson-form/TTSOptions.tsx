'use client';

import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { cn } from '@/lib/utils';
import { ttsProviderAtom, ttsVoiceAtom, ttsVoice2Atom, ttsModelAtom } from '@/lib/atoms';
import { useTTSConfig, TTSProvider } from '@/hooks/useTTSConfig';
import { useTTSGenerate } from '@/hooks/useTTSGenerate';

interface TTSOptionsProps {
  lessonId: string;
  isDialog: boolean;
  disabled?: boolean;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export function TTSOptions({ lessonId, isDialog, disabled, onError, onSuccess }: TTSOptionsProps) {
  const { providers, isLoading: isLoadingConfig } = useTTSConfig();
  const { generate, isGenerating } = useTTSGenerate(lessonId, { onSuccess, onError });

  const [selectedProvider, setSelectedProvider] = useAtom(ttsProviderAtom);
  const [selectedVoice, setSelectedVoice] = useAtom(ttsVoiceAtom);
  const [selectedVoice2, setSelectedVoice2] = useAtom(ttsVoice2Atom);
  const [selectedModel, setSelectedModel] = useAtom(ttsModelAtom);

  // Initialize/validate selections when providers load
  useEffect(() => {
    if (providers.length === 0) return;

    // Check if saved provider is still valid
    const savedProviderValid = selectedProvider && providers.some((p) => p.id === selectedProvider);
    const provider = savedProviderValid
      ? providers.find((p) => p.id === selectedProvider)!
      : providers[0];

    // Set provider if not saved or invalid
    if (!savedProviderValid) {
      setSelectedProvider(provider.id);
    }

    // Check if saved voice is valid for this provider
    const dialogVoices = provider.defaultDialogVoices;
    const savedVoiceValid = selectedVoice && provider.voices.includes(selectedVoice);
    if (!savedVoiceValid) {
      if (dialogVoices && dialogVoices.length >= 2) {
        setSelectedVoice(dialogVoices[0]);
      } else {
        setSelectedVoice(provider.defaultVoice);
      }
    }

    // Check if saved voice2 is valid
    const savedVoice2Valid = selectedVoice2 && provider.voices.includes(selectedVoice2);
    if (!savedVoice2Valid) {
      if (dialogVoices && dialogVoices.length >= 2) {
        setSelectedVoice2(dialogVoices[1]);
      } else if (provider.voices?.length >= 2) {
        setSelectedVoice2(provider.voices[1]);
      }
    }

    // Check if saved model is valid
    const savedModelValid = selectedModel && provider.models.includes(selectedModel);
    if (!savedModelValid) {
      setSelectedModel(provider.defaultModel);
    }
  }, [providers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      // Reset to provider defaults when switching providers
      const dialogVoices = provider.defaultDialogVoices;
      if (dialogVoices && dialogVoices.length >= 2) {
        setSelectedVoice(dialogVoices[0]);
        setSelectedVoice2(dialogVoices[1]);
      } else {
        setSelectedVoice(provider.defaultVoice);
        if (provider.voices?.length >= 2) {
          setSelectedVoice2(provider.voices[1]);
        }
      }
      setSelectedModel(provider.defaultModel);
    }
  };

  const handleGenerate = () => {
    generate({
      provider: selectedProvider,
      voiceName: selectedVoice,
      model: selectedModel,
      voice2Name: selectedVoice2,
    });
  };

  if (isLoadingConfig || providers.length === 0) {
    return null;
  }

  const currentProvider = providers.find(p => p.id === selectedProvider) || providers[0];
  const isDisabled = disabled || isGenerating;

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

      {/* Voice Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isDialog ? 'Speaker 1 Voice' : 'Voice'}
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
      {isDialog && (
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
        {isGenerating ? (
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
