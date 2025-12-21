'use client';

import { cn } from '@/lib/utils';

export type AudioMode = 'upload' | 'tts' | 'transcribed';

interface Tab {
  mode: AudioMode;
  label: string;
  color?: 'blue' | 'green';
}

interface AudioModeTabsProps {
  activeMode: AudioMode;
  onModeChange: (mode: AudioMode) => void;
  showTTS?: boolean;
  showTranscribed?: boolean;
  className?: string;
}

export function AudioModeTabs({
  activeMode,
  onModeChange,
  showTTS = false,
  showTranscribed = false,
  className,
}: AudioModeTabsProps) {
  const tabs: Tab[] = [];

  if (showTranscribed) {
    tabs.push({ mode: 'transcribed', label: 'Use Transcribed Audio', color: 'green' });
  }
  tabs.push({ mode: 'upload', label: 'Upload Audio', color: 'blue' });
  if (showTTS) {
    tabs.push({ mode: 'tts', label: 'Generate with TTS', color: 'blue' });
  }

  if (tabs.length <= 1) {
    return null;
  }

  return (
    <div className={cn('flex border-b border-gray-200 mb-6', className)}>
      {tabs.map((tab) => {
        const isActive = activeMode === tab.mode;
        const activeColor = tab.color === 'green' ? 'border-green-500 text-green-600' : 'border-blue-500 text-blue-600';

        return (
          <button
            key={tab.mode}
            type="button"
            onClick={() => onModeChange(tab.mode)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? activeColor
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
