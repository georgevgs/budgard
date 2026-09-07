import { useTranslation } from 'react-i18next';
import { TransactionsSkeletonBody } from '@/common/components/common/TransactionsSkeletonBody';
import LoadingScreen from '@/common/ui/loading-screen';
import type { TranslateFunction } from '@/constants/translate';

type Section = 'expenses' | 'income';

type TransactionsLoadingProps = {
  section?: Section;
};

// Mirrors the structure of the screen it is about to become so the transition
// from skeleton → real content feels seamless rather than jarring. Today, Plan,
// Activity and the transaction detail all reuse it — they share a layout — and
// differ only in what gets announced to assistive tech.
export const TransactionsLoading = ({
  section = 'expenses',
}: TransactionsLoadingProps) => {
  const { t } = useTranslation();

  return (
    <LoadingScreen
      label={t('common.loadingSection', {
        section: resolveSectionName(section, t),
      })}
      className="flex flex-col min-h-[calc(100dvh-var(--header-height)-env(safe-area-inset-top)-var(--dock-inset))]"
    >
      <TransactionsSkeletonBody />
    </LoadingScreen>
  );
};

const resolveSectionName = (section: Section, t: TranslateFunction): string => {
  if (section === 'income') {
    return t('navigation.income');
  }

  return t('navigation.expenses');
};
