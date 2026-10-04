import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import { ConfirmDestructiveDialog } from '@/common/components/common/ConfirmDestructiveDialog';
import { Button } from '@/common/ui/button';
import { Skeleton } from '@/common/ui/skeleton';
import { useTransactionRules } from '@/pages/settings/hooks/useTransactionRules';
import { useTransactionRuleOps } from '@/common/hooks/dataOps/useTransactionRuleOps';
import { TransactionRuleRow } from '@/pages/settings/components/TransactionRuleRow';
import type { TransactionRule } from '@/types/TransactionRule';
import type { TranslateFunction } from '@/constants/translate';

export const TransactionRulesSection = () => {
  const { t } = useTranslation();
  const rules = useTransactionRules();
  const { deleteRule } = useTransactionRuleOps(rules.setRules);
  const [selection, setSelection] = useState<{
    ownerId: string;
    rule: TransactionRule;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  let selected: TransactionRule | null = null;
  if (selection?.ownerId === rules.ownerId) {
    selected = selection.rule;
  }

  const handleDelete = async () => {
    if (!selected || isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteRule(selected.id);
    } catch {
      // The mutation runner restores the row and offers a retry.
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-2">
      <h2 className="type-heading text-base">{t('settings.rules.title')}</h2>
      <SurfaceCard className="p-4">
        <p className="mb-4 text-sm text-muted-foreground">
          {t('settings.rules.description')}
        </p>
        {renderRules(
          rules,
          isDeleting,
          (rule) => setSelection({ ownerId: rules.ownerId, rule }),
          t,
        )}
      </SurfaceCard>
      <ConfirmDestructiveDialog
        open={selected !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelection(null);
          }
        }}
        title={t('settings.rules.deleteTitle')}
        description={t('settings.rules.deleteDescription')}
        confirmLabel={t('common.delete')}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
};

const renderRules = (
  state: ReturnType<typeof useTransactionRules>,
  isDeleting: boolean,
  onDelete: (rule: TransactionRule) => void,
  t: TranslateFunction,
) => {
  if (state.isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }
  if (state.hasError) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-sm text-destructive-ink">
          {t('settings.rules.loadFailed')}
        </p>
        <Button variant="outline" onClick={state.retry}>
          {t('common.tryAgain')}
        </Button>
      </div>
    );
  }
  if (state.rules.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('settings.rules.empty')}
        </p>
        <Button asChild variant="outline">
          <Link to="/review">{t('settings.rules.reviewAction')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {state.rules.map((rule) => (
        <TransactionRuleRow
          key={rule.id}
          rule={rule}
          isDeleting={isDeleting}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
