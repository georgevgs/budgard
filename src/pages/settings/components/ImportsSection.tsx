import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Upload from 'lucide-react/dist/esm/icons/upload';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import { Button } from '@/common/ui/button';
import { lazyWithRetry } from '@/constants/lazyWithRetry';
import { TransactionRulesSection } from '@/pages/settings/components/TransactionRulesSection';

const CsvImportDialog = lazyWithRetry(async () => {
  const module = await import('@/common/components/csvImport/CsvImportDialog');

  return { default: module.CsvImportDialog };
});

export const ImportsSection = () => {
  const { t } = useTranslation();
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="type-heading text-base">
          {t('settings.imports.title')}
        </h2>
        <SurfaceCard className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            {t('settings.imports.description')}
          </p>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('settings.imports.action')}
          </Button>
        </SurfaceCard>
      </section>
      <TransactionRulesSection />
      {renderImportDialog(isImportOpen, () => setIsImportOpen(false))}
    </div>
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
