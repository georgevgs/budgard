import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/hooks/useToast.ts';

export function usePwaUpdate() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegistered(registration) {
      console.log('SW Registered:', registration);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [isNeedRefresh, setNeedRefresh] = needRefresh;
  const { toast } = useToast();

  useEffect(() => {
    if (isNeedRefresh) {
      toast({
        title: 'Update Available',
        description: 'New content is available, click to update.',
        variant: 'default',
        onClick: () => {
          updateServiceWorker(true);
          setNeedRefresh(false);
        },
      });
    }
  }, [isNeedRefresh, setNeedRefresh, updateServiceWorker, toast]);
}
