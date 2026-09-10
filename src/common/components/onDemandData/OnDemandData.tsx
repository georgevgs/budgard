import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';
import { useOnDemandData } from '@/common/components/onDemandData/hooks/useOnDemandData';
import type { OnDemandDomain } from '@/common/hooks/data/dataOptional';

type OnDemandDataProps = {
  domain: OnDemandDomain;
  children: ReactNode;
};

// Keep the surrounding page and its way out visible. Unloaded preferences
// must never appear as editable defaults or an empty history.
export const OnDemandData = ({ domain, children }: OnDemandDataProps) => {
  const { t } = useTranslation();
  const { status, retry } = useOnDemandData(domain);

  if (status === 'loading') {
    return (
      <p role="status" className="py-4 text-sm text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }
  if (status === 'error') {
    return (
      <div role="alert" className="space-y-3 py-4">
        <p className="text-sm">{t('common.loadDataFailed')}</p>
        <Button variant="outline" onClick={retry}>
          {t('common.tryAgain')}
        </Button>
      </div>
    );
  }

  return children;
};
