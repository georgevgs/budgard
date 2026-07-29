import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingScreen from '@/components/ui/loading-screen';

// Prose placeholder for /privacy, /terms and /contact. Mirrors
// LegalPageLayout: header bar, narrow reading column, then paragraph blocks.
const PARAGRAPHS = [
  ['w-full', 'w-full', 'w-4/5'],
  ['w-full', 'w-3/4'],
  ['w-full', 'w-full', 'w-2/3'],
  ['w-full', 'w-5/6'],
] as const;

const LegalLoadingState = () => {
  const { t } = useTranslation();

  return (
    <LoadingScreen
      label={t('common.loading')}
      className="min-h-dvh bg-background"
    >
      <header className="border-b border-border/60">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-10 space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-9 w-2/5" />
          <Skeleton className="h-4 w-48" />
        </div>

        {PARAGRAPHS.map((lines, sectionIndex) => (
          <div key={`legal-skel-${sectionIndex}`} className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            {lines.map((width, lineIndex) => (
              <Skeleton
                key={`legal-line-${sectionIndex}-${lineIndex}`}
                className={`h-4 ${width}`}
              />
            ))}
          </div>
        ))}
      </main>
    </LoadingScreen>
  );
};

export default LegalLoadingState;
