'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProcessingStatusProps {
  lessonId: string;
}

const SHOW_CANCEL_AFTER_MS = 60000; // Show cancel button after 1 minute

export function ProcessingStatus({ lessonId }: ProcessingStatusProps) {
  const router = useRouter();
  const [startTime] = useState(() => Date.now());
  const [showCancel, setShowCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/lessons/${lessonId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'READY' || data.status === 'FAILED' || data.status === 'UPLOADED') {
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

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setElapsed(now - startTime);
      if (now - startTime >= SHOW_CANCEL_AFTER_MS) {
        setShowCancel(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        console.error('Cancel failed:', data.error);
        setIsCancelling(false);
      }
    } catch (error) {
      console.error('Error cancelling:', error);
      setIsCancelling(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        <p className="text-sm text-gray-400 mb-2">
          Elapsed: {formatTime(elapsed)}
        </p>
        <p className="text-sm text-gray-400 mb-6">This page will automatically refresh when ready.</p>

        <div className="space-y-3">
          {showCancel && (
            <div className="mb-4">
              <p className="text-sm text-amber-600 mb-2">
                Taking longer than expected?
              </p>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Cancelling...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Processing
                  </>
                )}
              </button>
            </div>
          )}

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
    </div>
  );
}
