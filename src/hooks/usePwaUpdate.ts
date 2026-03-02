import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from '@/hooks/useToast';

export function usePwaUpdate() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const [isNeedRefresh, setNeedRefresh] = needRefresh;

  useEffect(() => {
    if (isNeedRefresh) {
      toast({
        title: 'Update available',
        description: 'A new version of Budgard is ready.',
        duration: Infinity,
        action: {
          label: 'Update',
          onClick: () => {
            updateServiceWorker(true);
            setNeedRefresh(false);
          },
        },
      });
    }
  }, [isNeedRefresh, setNeedRefresh, updateServiceWorker]);
}
