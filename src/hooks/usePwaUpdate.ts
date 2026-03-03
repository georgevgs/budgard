import { useRegisterSW } from 'virtual:pwa-register/react';

export function usePwaUpdate() {
  useRegisterSW({
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });
}
