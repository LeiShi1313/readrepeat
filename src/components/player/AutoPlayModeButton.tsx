'use client';

export type AutoPlayMode = 'off' | 'once' | 'loop' | 'repeat';

interface AutoPlayModeButtonProps {
  mode: AutoPlayMode;
  onModeChange: (mode: AutoPlayMode) => void;
}

const MODES: AutoPlayMode[] = ['off', 'once', 'loop', 'repeat'];

const MODE_TITLES: Record<AutoPlayMode, string> = {
  off: 'Auto-play off',
  once: 'Play all once',
  loop: 'Loop all',
  repeat: 'Repeat current',
};

export function AutoPlayModeButton({ mode, onModeChange }: AutoPlayModeButtonProps) {
  const handleClick = () => {
    const currentIndex = MODES.indexOf(mode);
    const nextIndex = (currentIndex + 1) % MODES.length;
    onModeChange(MODES[nextIndex]);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors min-w-[100px] justify-end ${
        mode !== 'off' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
      }`}
      title={MODE_TITLES[mode]}
    >
      {mode === 'off' && (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Off</span>
        </>
      )}
      {mode === 'once' && (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <span>All</span>
        </>
      )}
      {mode === 'loop' && (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Loop</span>
        </>
      )}
      {mode === 'repeat' && (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m0 0a8.001 8.001 0 0115.356 2M4.582 9H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            <text x="12" y="13" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">1</text>
          </svg>
          <span>Repeat</span>
        </>
      )}
    </button>
  );
}
