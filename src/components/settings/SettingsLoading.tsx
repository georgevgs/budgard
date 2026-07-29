import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingScreen from '@/components/ui/loading-screen';

// Row counts per section, mirroring SettingsView's real order: profile,
// billing, appearance, language, currency, notifications, data, about.
const SECTIONS = [2, 2, 3, 1, 1, 4, 2, 2] as const;

const SettingsLoadingState = () => {
  const { t } = useTranslation();

  return (
    <LoadingScreen
      label={t('common.loadingSettings')}
      className="container max-w-lg mx-auto p-4 pb-12 space-y-8"
    >
      <Skeleton className="h-6 w-28" />

      {SECTIONS.map((rowCount, sectionIndex) => (
        <div key={`settings-skel-${sectionIndex}`} className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/50">
            {renderRows(rowCount, sectionIndex)}
          </div>
        </div>
      ))}
    </LoadingScreen>
  );
};

export default SettingsLoadingState;

// --- Helpers ---

const ROW_WIDTHS = ['w-2/5', 'w-1/2', 'w-1/3', 'w-2/5'] as const;

const renderRows = (rowCount: number, sectionIndex: number) => {
  return Array.from({ length: rowCount }, (_, rowIndex) => (
    <div
      key={`settings-row-${sectionIndex}-${rowIndex}`}
      className="flex items-center justify-between gap-4 px-4 py-3.5"
    >
      <Skeleton className={`h-4 ${ROW_WIDTHS[rowIndex % ROW_WIDTHS.length]}`} />
      <Skeleton className="h-5 w-10 rounded-full shrink-0" />
    </div>
  ));
};
