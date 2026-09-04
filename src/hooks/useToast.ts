import { toast as sonnerToast } from 'sonner';
import type { ExternalToast } from 'sonner';

type ToastVariant = 'default' | 'destructive' | 'success';

type ToastParams = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  // Stable id: sonner replaces an existing toast with the same id instead of
  // stacking a duplicate. Used e.g. by the PWA update prompt so it can never
  // pile up across re-renders or repeated update checks.
  id?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
};

const toast = ({
  variant,
  title,
  description,
  duration,
  id,
  action,
  onDismiss,
}: ToastParams) => {
  const message = title ?? description ?? '';
  const opts: ExternalToast = {};
  if (title && description) opts.description = description;
  if (id !== undefined) opts.id = id;
  if (duration !== undefined) opts.duration = duration;
  if (onDismiss) {
    opts.onDismiss = () => onDismiss();
    opts.onAutoClose = () => onDismiss();
  }
  if (action) {
    opts.action = { label: action.label, onClick: action.onClick };
    // Ensure action toasts stay visible long enough to interact with
    if (duration === undefined) opts.duration = 8000;
  }

  if (variant === 'destructive') {
    // Errors need reading time — the 3s global default is too short,
    // especially in a second language
    if (opts.duration === undefined) opts.duration = 8000;

    return sonnerToast.error(message, opts);
  }
  if (variant === 'success') {
    return sonnerToast.success(message, opts);
  }

  return sonnerToast(message, opts);
};

const useToast = () => {
  return { toast };
};

export { useToast, toast };
