'use client';

import { useState } from 'react';
import { WorkingSentence } from './FineTuneEditor';
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
  DialogCancelButton,
  DialogConfirmButton,
} from './ui/Dialog';
import { TextareaField } from './ui/TextareaField';

interface SplitDialogProps {
  sentence: WorkingSentence;
  splitTimeMs: number | null;
  onConfirm: (
    firstText: { foreign: string; translation: string },
    secondText: { foreign: string; translation: string }
  ) => void;
  onCancel: () => void;
  formatMs: (ms: number) => string;
}

export function SplitDialog({ sentence, splitTimeMs, onConfirm, onCancel, formatMs }: SplitDialogProps) {
  const [firstForeign, setFirstForeign] = useState('');
  const [firstTranslation, setFirstTranslation] = useState('');
  const [secondForeign, setSecondForeign] = useState('');
  const [secondTranslation, setSecondTranslation] = useState('');

  const canConfirm =
    splitTimeMs !== null &&
    firstForeign.trim() !== '' &&
    secondForeign.trim() !== '' &&
    splitTimeMs > sentence.startMs &&
    splitTimeMs < sentence.endMs;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(
      { foreign: firstForeign.trim(), translation: firstTranslation.trim() },
      { foreign: secondForeign.trim(), translation: secondTranslation.trim() }
    );
  };

  return (
    <Dialog open={true} onClose={onCancel}>
      <DialogHeader
        title="Split Segment"
        description={`Split segment #${sentence.idx + 1} into two parts`}
      />

      <DialogContent className="space-y-6">
        {/* Original text reference */}
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Original Text</p>
          <p className="text-sm text-gray-900 font-medium">{sentence.foreignText}</p>
          <p className="text-sm text-gray-700 mt-1">{sentence.translationText}</p>
          <div className="mt-2 text-xs text-gray-600">
            {formatMs(sentence.startMs)} - {formatMs(sentence.endMs)}
          </div>
        </div>

        {/* Split point indicator */}
        <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <span className="text-orange-800 font-medium">
              Split point: <strong>{formatMs(splitTimeMs!)}</strong>
            </span>
          </div>
        </div>

        {/* First segment */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 uppercase tracking-wide">First Segment</span>
            {splitTimeMs !== null && (
              <span className="text-sm text-gray-600">
                ({formatMs(sentence.startMs)} - {formatMs(splitTimeMs)})
              </span>
            )}
          </div>
          <TextareaField
            label="Foreign Text"
            value={firstForeign}
            onChange={(e) => setFirstForeign(e.target.value)}
            placeholder="Enter the text for the first part..."
          />
          <TextareaField
            label="Translation"
            value={firstTranslation}
            onChange={(e) => setFirstTranslation(e.target.value)}
            placeholder="Enter the translation for the first part..."
          />
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-white text-sm text-gray-600 font-medium uppercase tracking-wide">Split Point</span>
          </div>
        </div>

        {/* Second segment */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Second Segment</span>
            {splitTimeMs !== null && (
              <span className="text-sm text-gray-600">
                ({formatMs(splitTimeMs)} - {formatMs(sentence.endMs)})
              </span>
            )}
          </div>
          <TextareaField
            label="Foreign Text"
            value={secondForeign}
            onChange={(e) => setSecondForeign(e.target.value)}
            placeholder="Enter the text for the second part..."
          />
          <TextareaField
            label="Translation"
            value={secondTranslation}
            onChange={(e) => setSecondTranslation(e.target.value)}
            placeholder="Enter the translation for the second part..."
          />
        </div>
      </DialogContent>

      <DialogFooter>
        <DialogCancelButton onClick={onCancel} />
        <DialogConfirmButton onClick={handleConfirm} disabled={!canConfirm} variant="orange">
          Split Segment
        </DialogConfirmButton>
      </DialogFooter>
    </Dialog>
  );
}
