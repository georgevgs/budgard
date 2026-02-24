import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RootProvider } from '@/contexts/RootProvider';
import App from '@/App';
import './lib/i18n';
import './index.css';

// Recover from stale SW cache causing chunk load failures (common on iOS PWA after
// a deployment while the app was backgrounded — old JS tries to load old chunk hashes
// that no longer exist in the new SW precache).
if (!sessionStorage.getItem('sw-chunk-reload')) {
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const msg: string = event.reason?.message ?? '';
    const isChunkLoadError =
      msg.includes('dynamically imported module') ||
      msg.includes('Importing a module script failed');
    if (isChunkLoadError) {
      sessionStorage.setItem('sw-chunk-reload', '1');
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootProvider>
      <App />
    </RootProvider>
  </StrictMode>,
);
