import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';

const ROWS = ['w-2/5', 'w-1/2', 'w-1/3'] as const;

// Stands in for months whose rows are still streaming in from the background
// history fetch. Rather than a full-screen skeleton or a misleading "nothing
// here" empty state, this shimmers only the part that is genuinely in flight —
// everything already loaded stays on screen and usable around it.
const PendingHistoryNotice = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2 pt-1">
      <p
        role="status"
        className="py-2 text-center text-sm text-muted-foreground"
      >
        {t('common.loadingOlderTransactions')}
      </p>

      <div className="space-y-2" aria-hidden="true">
        {ROWS.map((width, i) => (
          <div
            key={`pending-history-${i}`}
            className="tile-flush rounded-2xl"
          >
            <div className="flex">
              <Skeleton className="w-1 h-16 rounded-none shrink-0" />
              <div className="p-4 flex-1 flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2 min-w-0">
                  <Skeleton className={`h-4 ${width}`} />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-14 shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingHistoryNotice;
