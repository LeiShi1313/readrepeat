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
} from '@/components/ui/Dialog';
import { TextareaField } from '@/components/ui/TextareaField';

interface SentenceEditDialogProps {
  sentence: WorkingSentence;
  onSave: (foreign: string, translation: string) => void;
  onCancel: () => void;
  formatMs: (ms: number) => string;
}

export function SentenceEditDialog({ sentence, onSave, onCancel, formatMs }: SentenceEditDialogProps) {
  const [foreignText, setForeignText] = useState(sentence.foreignText);
  const [translationText, setTranslationText] = useState(sentence.translationText);

  const hasChanges =
    foreignText.trim() !== sentence.foreignText || translationText.trim() !== sentence.translationText;

  const canSave = foreignText.trim() !== '' && hasChanges;

  const handleSave = () => {
    if (!canSave) return;
    onSave(foreignText.trim(), translationText.trim());
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="lg">
      <DialogHeader
        title="Edit Sentence"
        description={`Segment #${sentence.idx + 1}`}
      />

      <DialogContent className="space-y-4">
        {/* Timing info */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {formatMs(sentence.startMs)} - {formatMs(sentence.endMs)}
            <span className="text-gray-400 ml-2">
              ({((sentence.endMs - sentence.startMs) / 1000).toFixed(1)}s)
            </span>
          </span>
        </div>

        <TextareaField
          label="Foreign Text"
          value={foreignText}
          onChange={(e) => setForeignText(e.target.value)}
          placeholder="Enter the foreign text..."
          rows={3}
        />

        <TextareaField
          label="Translation"
          value={translationText}
          onChange={(e) => setTranslationText(e.target.value)}
          placeholder="Enter the translation..."
          rows={3}
        />
      </DialogContent>

      <DialogFooter>
        <DialogCancelButton onClick={onCancel} />
        <DialogConfirmButton onClick={handleSave} disabled={!canSave}>
          Save Changes
        </DialogConfirmButton>
      </DialogFooter>
    </Dialog>
  );
}
