'use client';

import { atomWithStorage } from 'jotai/utils';

// User preferences persisted to localStorage
export const foreignLangAtom = atomWithStorage('readrepeat:foreignLang', 'en');
export const translationLangAtom = atomWithStorage('readrepeat:translationLang', 'zh');
export const whisperModelAtom = atomWithStorage('readrepeat:whisperModel', 'base');
