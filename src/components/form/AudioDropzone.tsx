'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AudioDropzoneProps {
  onUpload: (file: File) => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function AudioDropzone({
  onUpload,
  onError,
  isLoading,
  className,
}: AudioDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { dragActive, handleDrag, handleDrop } = useDragAndDrop({
    onDrop: onUpload,
    onError,
    acceptedTypes: ['audio/'],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !isLoading && fileInputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        isLoading ? 'cursor-not-allowed bg-gray-50' : 'cursor-pointer',
        dragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50',
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />
      <div className="text-gray-600">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <LoadingSpinner size="md" />
            Uploading...
          </div>
        ) : (
          <>
            <svg
              className="w-10 h-10 mx-auto mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <span className="font-medium">Click or drag to upload audio file</span>
          </>
        )}
      </div>
      <div className="text-sm text-gray-500 mt-2">
        Supported formats: MP3, WAV, M4A, OGG, WEBM
      </div>
    </div>
  );
}
