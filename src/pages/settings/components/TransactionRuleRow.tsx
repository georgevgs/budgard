import { useTranslation } from 'react-i18next';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { Button } from '@/common/ui/button';
import type { TransactionRule } from '@/types/TransactionRule';
import type { TranslateFunction } from '@/constants/translate';

type TransactionRuleRowProps = {
  rule: TransactionRule;
  isDeleting: boolean;
  onDelete: (rule: TransactionRule) => void;
};

export const TransactionRuleRow = ({
  rule,
  isDeleting,
  onDelete,
}: TransactionRuleRowProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold">{rule.match_value}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(`settings.rules.match.${rule.match_type}`)}
          {' · '}
          {t(`settings.rules.appliesTo.${rule.transaction_type}`)}
        </p>
        {renderRename(rule.rename_to, t)}
        {renderPaused(rule.is_active, t)}
      </div>
      <Button
        size="icon"
        variant="ghost"
        disabled={isDeleting}
        aria-label={t('settings.rules.deleteLabel', {
          match: rule.match_value,
        })}
        onClick={() => onDelete(rule)}
      >
        <Trash2 className="h-4 w-4 text-destructive-ink" aria-hidden="true" />
      </Button>
    </div>
  );
};

const renderRename = (name: string | null, t: TranslateFunction) => {
  if (!name) {
    return null;
  }

  return (
    <p className="mt-1 break-words text-xs text-muted-foreground">
      {t('settings.rules.rename', { name })}
    </p>
  );
};

const renderPaused = (isActive: boolean, t: TranslateFunction) => {
  if (isActive) {
    return null;
  }

  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {t('settings.rules.paused')}
    </p>
  );
};
