import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';

// Failure toast for data mutations. Pass the failed operation as onRetry so
// the user gets a "Try again" action instead of having to re-enter everything.
export const useShowErrorToast = () => {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useCallback(
    (message: string, onRetry?: () => void) => {
      if (!onRetry) {
        toast({ variant: 'destructive', description: message });

        return;
      }

      toast({
        variant: 'destructive',
        description: message,
        action: {
          label: t('common.tryAgain'),
          onClick: onRetry,
        },
      });
    },
    [toast, t],
  );
};
