export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
] as const;

export const WHISPER_MODEL_OPTIONS = [
  { value: 'tiny', label: 'Tiny (39MB) - Fastest, lower accuracy' },
  { value: 'base', label: 'Base (74MB) - Fast, good accuracy' },
  { value: 'small', label: 'Small (244MB) - Balanced' },
  { value: 'medium', label: 'Medium (769MB) - Slower, high accuracy' },
  { value: 'large-v3', label: 'Large-v3 (3GB) - Slowest, highest accuracy' },
] as const;

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]['value'];
export type WhisperModel = (typeof WHISPER_MODEL_OPTIONS)[number]['value'];
