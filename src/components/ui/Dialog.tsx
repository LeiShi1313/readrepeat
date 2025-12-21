'use client';

import { ReactNode, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function Dialog({ open, onClose, children, className, maxWidth = '2xl' }: DialogProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={cn(
          'bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto',
          maxWidthClasses[maxWidth],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface DialogHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function DialogHeader({ title, description, children }: DialogHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      {children}
    </div>
  );
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

export function DialogContent({ children, className }: DialogContentProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3', className)}>
      {children}
    </div>
  );
}

interface DialogCancelButtonProps {
  onClick: () => void;
  children?: ReactNode;
}

export function DialogCancelButton({ onClick, children = 'Cancel' }: DialogCancelButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
    >
      {children}
    </button>
  );
}

interface DialogConfirmButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'orange';
  children: ReactNode;
}

export function DialogConfirmButton({
  onClick,
  disabled = false,
  variant = 'primary',
  children,
}: DialogConfirmButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
        variantClasses[variant]
      )}
    >
      {children}
    </button>
  );
}
