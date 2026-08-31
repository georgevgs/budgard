import { Suspense, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import Upload from 'lucide-react/dist/esm/icons/upload';
import SurfaceCard from '@/components/common/SurfaceCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialConnections } from '@/hooks/connections/useFinancialConnections';
import { useDateLocale } from '@/hooks/useDateLocale';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import type { FinancialConnection } from '@/types/FinancialConnection';

const CsvImportDialog = lazyWithRetry(
  () => import('@/components/expenses/CsvImportDialog'),
);

const ConnectionsSection = () => {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const { connections, isLoading, hasError } = useFinancialConnections();
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t('settings.connections.title')}
      </p>
      <SurfaceCard>
        <div className="space-y-4 p-4">
          {renderConnections(connections, isLoading, hasError, locale, t)}
          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-sm text-muted-foreground">
              {t('settings.connections.importDescription')}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('settings.connections.importAction')}
            </Button>
          </div>
        </div>
      </SurfaceCard>
      {renderImportDialog(isImportOpen, () => setIsImportOpen(false))}
    </section>
  );
};

export default ConnectionsSection;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;
type DateLocale = ReturnType<typeof useDateLocale>;

const renderConnections = (
  connections: FinancialConnection[],
  isLoading: boolean,
  hasError: boolean,
  locale: DateLocale,
  t: TFunc,
) => {
  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }
  if (hasError) {
    return (
      <p className="text-sm text-destructive-ink">
        {t('settings.connections.loadFailed')}
      </p>
    );
  }
  if (connections.length === 0) {
    return (
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
          <Landmark className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">
            {t('settings.connections.notConfigured')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('settings.connections.notConfiguredDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {connections.map((connection) => renderConnection(connection, locale, t))}
    </div>
  );
};

const renderConnection = (
  connection: FinancialConnection,
  locale: DateLocale,
  t: TFunc,
) => {
  return (
    <div
      key={connection.id}
      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
    >
      <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {connection.institution_name}
        </p>
        {renderLastSync(connection.last_synced_at, locale, t)}
      </div>
      <Badge variant="secondary">
        {t(`settings.connections.status.${connection.status}`)}
      </Badge>
    </div>
  );
};

const renderLastSync = (
  lastSyncedAt: string | null,
  locale: DateLocale,
  t: TFunc,
) => {
  if (!lastSyncedAt) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground">
      {t('settings.connections.lastSynced', {
        date: format(parseISO(lastSyncedAt), 'PP', { locale }),
      })}
    </p>
  );
};

const renderImportDialog = (isOpen: boolean, onClose: () => void) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CsvImportDialog open onClose={onClose} />
    </Suspense>
  );
};
