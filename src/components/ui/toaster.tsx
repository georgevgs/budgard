import { useState, useEffect } from 'react';
import { Toaster as SonnerToaster } from 'sonner';

function getTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return 'dark';
  if (attr === 'barbie') return 'light';

  return 'light';
}

export function Toaster() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(getTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <SonnerToaster
      position="top-center"
      theme={theme}
      gap={8}
      style={
        {
          '--offset': 'calc(12px + env(safe-area-inset-top, 0px))',
        } as React.CSSProperties
      }
      toastOptions={{
        duration: 3000,
        classNames: {
          toast:
            'toast-custom !rounded-xl !shadow-lg !border !border-border/50 !backdrop-blur-xl !px-4 !py-3 !gap-2 !text-sm !font-medium',
          title: '!text-sm !font-semibold !text-foreground',
          description: '!text-xs !text-muted-foreground',
          actionButton:
            '!bg-primary !text-primary-foreground !rounded-lg !text-xs !font-semibold !px-3 !py-1.5',
          success: '!bg-emerald-500/10 !text-emerald-500 !border-emerald-500/20',
          error: '!bg-destructive/10 !text-destructive !border-destructive/20',
          icon: '!text-current',
        },
      }}
    />
  );
}
