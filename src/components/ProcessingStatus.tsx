'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProcessingStatusProps {
  lessonId: string;
}

export function ProcessingStatus({ lessonId }: ProcessingStatusProps) {
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/lessons/${lessonId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'READY' || data.status === 'FAILED') {
            router.refresh();
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    // Check immediately
    checkStatus();

    // Then poll every 2 seconds
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [lessonId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-blue-500 animate-spin" viewBox="0 0 24 24">
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
        </div>
        <h2 className="text-xl font-semibold mb-2">Processing Audio</h2>
        <p className="text-gray-600 mb-4">
          We&apos;re transcribing your audio and aligning it with the text. This may take a minute
          or two.
        </p>
        <p className="text-sm text-gray-400 mb-6">This page will automatically refresh when ready.</p>
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to All Lessons
        </Link>
      </div>
    </div>
  );
}
