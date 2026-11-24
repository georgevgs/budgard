import { useTranslation } from 'react-i18next';

const ReviewStatementDescription = ({
  isVisible,
  description,
}: {
  isVisible: boolean;
  description: string;
}) => {
  const { t } = useTranslation();

  if (isVisible) {
    return (
      <p className="mt-1 truncate text-[11px] text-muted-foreground">
        {t('review.statementSaid', { description })}
      </p>
    );
  } else {
    return null;
  }
};

export default ReviewStatementDescription;
