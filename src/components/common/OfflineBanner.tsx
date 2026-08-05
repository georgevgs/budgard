import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOfflineQueueCount } from '@/hooks/useOfflineQueueCount';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const OfflineBanner = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const pendingCount = useOfflineQueueCount();
  const wentOffline = useRef(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      wentOffline.current = true;
    }
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline || !wentOffline.current) return;

    setShowBackOnline(true);
    const timer = window.setTimeout(() => setShowBackOnline(false), 2500);

    return () => window.clearTimeout(timer);
  }, [isOnline]);

  if (!isOnline) {
    return renderStatusPill(OFFLINE_PILL, t('common.offline'));
  }
  if (pendingCount > 0) {
    return renderStatusPill(
      PENDING_PILL,
      t('offline.pending', { count: pendingCount }),
    );
  }
  if (showBackOnline) {
    return renderStatusPill(ONLINE_PILL, t('common.backOnline'));
  }

  return null;
};

export default OfflineBanner;

// --- Helpers ---

type StatusPillTone = {
  pill: string;
  dot: string;
};

const OFFLINE_PILL: StatusPillTone = {
  pill: 'bg-destructive text-destructive-foreground',
  dot: 'bg-destructive-foreground/70 animate-pulse',
};

const PENDING_PILL: StatusPillTone = {
  pill: 'bg-secondary text-secondary-foreground',
  dot: 'bg-secondary-foreground/70 animate-pulse',
};

const ONLINE_PILL: StatusPillTone = {
  pill: 'bg-income text-income-foreground',
  dot: 'bg-income-foreground/70',
};

const renderStatusPill = (tone: StatusPillTone, label: string) => {
  return (
    <div className="fixed bottom-[calc(var(--dock-clearance)+0.75rem)] left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        className={`flex items-center gap-2 rounded-full ${tone.pill} text-sm font-medium px-4 py-2 shadow-lg pointer-events-auto`}
      >
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        {label}
      </div>
    </div>
  );
};
