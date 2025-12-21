'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DownloadIndicatorProps {
  cached: number;
  total: number;
  isDownloading: boolean;
  isAllCached: boolean;
  onDownloadAll: () => void;
}

export function DownloadIndicator({
  cached,
  total,
  isDownloading,
  isAllCached,
  onDownloadAll,
}: DownloadIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (total === 0) return null;

  const progress = total > 0 ? (cached / total) * 100 : 0;

  return (
    <div className="relative">
      {/* Compact indicator button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors',
          isAllCached
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        )}
      >
        {isDownloading ? (
          <>
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{cached}/{total}</span>
          </>
        ) : isAllCached ? (
          <>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Offline</span>
          </>
        ) : (
          <>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>{cached}/{total}</span>
          </>
        )}
      </button>

      {/* Expanded dropdown */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border p-3 z-20 min-w-[200px]">
          <div className="text-xs text-gray-600 mb-2">
            {isAllCached
              ? 'All clips cached for offline use'
              : `${cached} of ${total} clips cached`}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isAllCached ? 'bg-green-500' : 'bg-blue-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Download button */}
          {!isAllCached && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownloadAll();
                setIsExpanded(false);
              }}
              disabled={isDownloading}
              className={cn(
                'w-full py-1.5 px-3 rounded text-xs font-medium transition-colors',
                isDownloading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              )}
            >
              {isDownloading ? 'Downloading...' : 'Download All'}
            </button>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
