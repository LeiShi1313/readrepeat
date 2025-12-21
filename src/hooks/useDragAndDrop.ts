'use client';

import { useState, useCallback } from 'react';

interface UseDragAndDropOptions {
  onDrop: (file: File) => void;
  onError?: (error: string) => void;
  acceptedTypes?: string[];
}

export function useDragAndDrop({
  onDrop,
  onError,
  acceptedTypes = ['audio/'],
}: UseDragAndDropOptions) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const isAccepted = acceptedTypes.some((type) =>
        type.endsWith('/') ? file.type.startsWith(type) : file.type === type
      );

      if (isAccepted) {
        onDrop(file);
      } else {
        onError?.(`Please upload a valid file type`);
      }
    },
    [acceptedTypes, onDrop, onError]
  );

  return {
    dragActive,
    handleDrag,
    handleDrop,
  };
}
