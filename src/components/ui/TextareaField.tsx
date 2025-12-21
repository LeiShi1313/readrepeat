'use client';

import { cn } from '@/lib/utils';
import { TextareaHTMLAttributes } from 'react';

interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label: string;
  className?: string;
  textareaClassName?: string;
}

export function TextareaField({
  label,
  className,
  textareaClassName,
  rows = 2,
  ...props
}: TextareaFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-800 mb-1">{label}</label>
      <textarea
        rows={rows}
        className={cn(
          'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          textareaClassName
        )}
        {...props}
      />
    </div>
  );
}
