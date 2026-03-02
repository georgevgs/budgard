import { toast as sonnerToast } from 'sonner';
import type { ExternalToast } from 'sonner';

type ToastVariant = 'default' | 'destructive' | 'success';

interface ToastParams {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function toast({ variant, title, description, duration, action }: ToastParams) {
  const message = title ?? description ?? '';
  const opts: ExternalToast = {};
  if (title && description) opts.description = description;
  if (duration !== undefined) opts.duration = duration;
  if (action) opts.action = { label: action.label, onClick: action.onClick };

  if (variant === 'destructive') {
    return sonnerToast.error(message, opts);
  }
  if (variant === 'success') {
    return sonnerToast.success(message, opts);
  }
  return sonnerToast(message, opts);
}

function useToast() {
  return { toast };
}

export { useToast, toast };
