import { useTranslation } from 'react-i18next';

type FilterResultsAnnouncerProps = {
  count: number;
  active: boolean;
};

// Screen-reader-only live region. While filters or search are active it
// announces how many expenses match, giving non-sighted users the same feedback
// that the visibly shrinking list gives everyone else.
export const FilterResultsAnnouncer = ({ count, active }: FilterResultsAnnouncerProps) => {
  const { t } = useTranslation();

  if (!active) {
    return null;
  }

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {t('expenses.resultsCount', { count })}
    </p>
  );
};
