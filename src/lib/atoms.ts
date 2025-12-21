'use client';

import { atomWithStorage } from 'jotai/utils';
import { atomFamily } from 'jotai-family';

// User preferences persisted to localStorage
export const foreignLangAtom = atomWithStorage('readrepeat:foreignLang', 'en');
export const translationLangAtom = atomWithStorage('readrepeat:translationLang', 'zh');
export const whisperModelAtom = atomWithStorage('readrepeat:whisperModel', 'base');

// TTS settings persisted to localStorage
export const ttsProviderAtom = atomWithStorage('readrepeat:ttsProvider', '');
export const ttsVoiceAtom = atomWithStorage('readrepeat:ttsVoice', '');
export const ttsVoice2Atom = atomWithStorage('readrepeat:ttsVoice2', '');
export const ttsModelAtom = atomWithStorage('readrepeat:ttsModel', '');

// Primary text setting: which text is always visible
export type PrimaryText = 'foreign' | 'translation';

// Per-lesson settings (persisted to localStorage)
export const lessonPrimaryTextAtomFamily = atomFamily((lessonId: string) =>
  atomWithStorage<PrimaryText>(`readrepeat:lesson:${lessonId}:primaryText`, 'translation')
);

export const lessonPlaybackSpeedAtomFamily = atomFamily((lessonId: string) =>
  atomWithStorage<number>(`readrepeat:lesson:${lessonId}:playbackSpeed`, 1)
);

export const lessonRevealAllAtomFamily = atomFamily((lessonId: string) =>
  atomWithStorage<boolean>(`readrepeat:lesson:${lessonId}:revealAll`, false)
);
