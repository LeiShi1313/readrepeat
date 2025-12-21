import { useEffect } from 'react';

/**
 * Suppresses unhandled AbortError rejections from WaveSurfer during component unmount.
 * WaveSurfer can throw AbortErrors when audio loading is cancelled, which are harmless
 * but would otherwise pollute the console.
 */
export function useAbortErrorSuppressor() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'AbortError') {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);
}
