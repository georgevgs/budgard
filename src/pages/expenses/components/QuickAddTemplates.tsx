import { TemplatesBar } from '@/pages/expenses/components/TemplatesBar';
import { useDataConfig, useTemplatesData } from '@/common/contexts/DataContext';
import { useTemplateOps } from '@/common/hooks/dataOps/useTemplateOps';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';

type QuickAddTemplatesProps = {
  onUse: (template: ExpenseTemplate) => void;
  onClose: () => void;
};

// A saved transaction is an entry shortcut, so it lives where transactions
// are added. Activity can now stay focused on finding and reading the ledger.
export const QuickAddTemplates = ({ onUse, onClose }: QuickAddTemplatesProps) => {
  const templates = useTemplatesData();
  const { defaultCurrency } = useDataConfig();
  const { handleTemplateDelete } = useTemplateOps();

  if (templates.length === 0) {
    return null;
  }

  const handleUse = (template: ExpenseTemplate) => {
    onUse(template);
    onClose();
  };

  return (
    <div className="mb-4">
      <TemplatesBar
        templates={templates}
        defaultCurrency={defaultCurrency}
        onUse={handleUse}
        onDelete={handleTemplateDelete}
      />
    </div>
  );
};
