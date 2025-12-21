import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Tag information interface used across the app.
 */
export interface TagInfo {
  id: string;
  name: string;
  displayName: string;
}

/**
 * Format date string to YYYY-MM-DD format.
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time in seconds to mm:ss.cc format (with centiseconds)
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Format duration in milliseconds to m:ss format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Adjust playback speed within bounds (0.5 to 2.0)
 */
export function adjustSpeed(current: number, delta: number): number {
  const newSpeed = Math.round((current + delta) * 10) / 10;
  return Math.max(0.5, Math.min(2, newSpeed));
}

/**
 * Check if text appears to be a dialog with speaker labels.
 * Detects patterns like:
 * - "Speaker 1:", "Sprecher 2 (Role):"
 * - "Person A:", "A:", "B:"
 * - Role labels: "Patient:", "Arzt:", "Mieter:"
 *
 * Returns true if at least 50% of lines have speaker labels AND there are 2+ distinct speakers.
 */
export function hasSpeakerTags(text: string): boolean {
  const lines = text.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return false;

  // Pattern matches speaker labels at start of line:
  // - Up to ~40 chars of letters, numbers, spaces
  // - Optional parenthetical like (Patient)
  // - Followed by colon and some content
  const speakerPattern = /^([A-Za-zÀ-ÿ0-9\s]{1,40}(?:\s*\([^)]{1,20}\))?)\s*:\s*\S/;

  const speakerLabels = new Set<string>();
  let linesWithSpeakers = 0;

  for (const line of lines) {
    const match = line.trim().match(speakerPattern);
    if (match) {
      // Normalize the label for comparison
      const label = match[1].trim().toLowerCase();
      speakerLabels.add(label);
      linesWithSpeakers++;
    }
  }

  // Consider it a dialog if:
  // 1. At least 50% of lines have speaker labels
  // 2. There are at least 2 distinct speakers
  return linesWithSpeakers >= lines.length * 0.5 && speakerLabels.size >= 2;
}

/**
 * Strip speaker labels from the start of each line.
 * Handles patterns like "Speaker 1:", "Person A:", "Patient:", "A:", etc.
 */
export function stripSpeakerTags(text: string): string {
  const lines = text.split('\n');
  // Pattern: speaker label (1-40 chars, optional parenthetical) followed by colon
  const speakerPattern = /^[A-Za-zÀ-ÿ0-9\s]{1,40}(?:\s*\([^)]{1,20}\))?\s*:\s*/;

  return lines
    .map(line => line.replace(speakerPattern, '').trim())
    .filter(line => line)
    .join('\n');
}
