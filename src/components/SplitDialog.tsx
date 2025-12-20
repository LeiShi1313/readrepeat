'use client';

import { useState } from 'react';
import { WorkingSentence } from './FineTuneEditor';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Split Segment</h2>
          <p className="text-sm text-gray-600 mt-1">
            Split segment #{sentence.idx + 1} into two parts
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
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
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Foreign Text</label>
              <textarea
                value={firstForeign}
                onChange={(e) => setFirstForeign(e.target.value)}
                placeholder="Enter the text for the first part..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Translation</label>
              <textarea
                value={firstTranslation}
                onChange={(e) => setFirstTranslation(e.target.value)}
                placeholder="Enter the translation for the first part..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Foreign Text</label>
              <textarea
                value={secondForeign}
                onChange={(e) => setSecondForeign(e.target.value)}
                placeholder="Enter the text for the second part..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Translation</label>
              <textarea
                value={secondTranslation}
                onChange={(e) => setSecondTranslation(e.target.value)}
                placeholder="Enter the translation for the second part..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Split Segment
          </button>
        </div>
      </div>
    </div>
  );
}
