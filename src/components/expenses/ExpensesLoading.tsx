import { useTranslation } from 'react-i18next';

const ExpenseLoadingState = () => {
  const { t } = useTranslation();

  return (
    <div className="text-center py-8">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
      <p className="text-sm text-muted-foreground mt-2">
        {t('expenses.loading')}
      </p>
    </div>
  );
};

export default ExpenseLoadingState;
