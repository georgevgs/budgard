import { useCallback } from 'react';
import { useToast } from '@/hooks/useToast';

export const useShowErrorToast = () => {
  const { toast } = useToast();

  return useCallback(
    (message: string) => {
      toast({ variant: 'destructive', description: message });
    },
    [toast],
  );
};
