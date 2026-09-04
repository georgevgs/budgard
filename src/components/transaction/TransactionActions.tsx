import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';

type Props = {
  isExcluded: boolean;
  onToggleExcluded: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const TransactionActions = (props: Props) => {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <section className="space-y-4">
      <div className="surface-card flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium" id="tx-exclude-label">
            {t('transaction.exclude.label')}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {t('transaction.exclude.description')}
          </p>
        </div>
        <Switch
          checked={props.isExcluded}
          onCheckedChange={props.onToggleExcluded}
          aria-labelledby="tx-exclude-label"
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-full"
          onClick={props.onEdit}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {t('common.edit')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full text-destructive-ink"
          onClick={() => setConfirmDelete(true)}
          aria-label={t('common.delete')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ConfirmDestructiveDialog
        open={confirmDelete}
        title={t('transaction.delete')}
        description={t('transaction.deleteConfirmation')}
        confirmLabel={t('common.delete')}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDelete(false);
          }
        }}
        onConfirm={props.onDelete}
      />
    </section>
  );
};

export default TransactionActions;
