import { toast as sonnerToast } from 'sonner';
import type { ExternalToast } from 'sonner';

type ToastVariant = 'default' | 'destructive' | 'success';

export type ToastParams = {
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

// How long a toast stays when the caller does not say. The floor is reading
// time for one line in a second language — the old 3s global default cleared
// a toast with a second line before it could be read. A description adds a
// line to read; anything the user can act on, and every error, stays long
// enough to reach for.
const DURATION_TITLE_ONLY = 4000;
const DURATION_WITH_DESCRIPTION = 6000;
const DURATION_ACTIONABLE = 8000;

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
  const hasDescription = Boolean(title && description);
  const isActionable = variant === 'destructive' || Boolean(action);
  const opts: ExternalToast = {
    duration:
      duration ?? resolveDuration(hasDescription, isActionable),
  };
  if (hasDescription) {
    opts.description = description;
  }
  if (id !== undefined) {
    opts.id = id;
  }
  if (onDismiss) {
    opts.onDismiss = () => onDismiss();
    opts.onAutoClose = () => onDismiss();
  }
  if (action) {
    opts.action = { label: action.label, onClick: action.onClick };
  }

  if (variant === 'destructive') {
    // An error stays for eight seconds, so it gets a visible way out — swipe
    // is the only other one, and a mouse user never discovers it. The same
    // failure raised twice (both refreshes on one bad connection) updates
    // one toast instead of stacking an identical pair.
    opts.closeButton = true;
    opts.id ??= `error:${message}:${opts.description ?? ''}`;

    return sonnerToast.error(message, opts);
  }
  if (variant === 'success') {
    return sonnerToast.success(message, opts);
  }

  return sonnerToast(message, opts);
};

const resolveDuration = (
  hasDescription: boolean,
  isActionable: boolean,
): number => {
  if (isActionable) {
    return DURATION_ACTIONABLE;
  }
  if (hasDescription) {
    return DURATION_WITH_DESCRIPTION;
  }

  return DURATION_TITLE_ONLY;
};

const useToast = () => {
  return { toast };
};

export { useToast, toast };
