import { useState, useEffect } from 'react';
import { Toaster as SonnerToaster } from 'sonner';

function getTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';
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
      position="bottom-center"
      theme={theme}
      richColors
      gap={8}
      style={
        {
          // 96px base + safe-area so toasts always clear the bottom nav
          // (nav is ~60px content + env(safe-area-inset-bottom) on notch devices)
          '--offset': 'calc(96px + env(safe-area-inset-bottom, 0px))',
        } as React.CSSProperties
      }
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: 'rounded-2xl',
        },
      }}
    />
  );
}
