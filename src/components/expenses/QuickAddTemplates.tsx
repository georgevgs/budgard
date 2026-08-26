import TemplatesBar from '@/components/expenses/TemplatesBar';
import { useDataConfig, useTemplatesData } from '@/contexts/DataContext';
import { useTemplateOps } from '@/hooks/dataOps/useTemplateOps';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';

type Props = {
  onUse: (template: ExpenseTemplate) => void;
  onClose: () => void;
};

// A saved transaction is an entry shortcut, so it lives where transactions
// are added. Activity can now stay focused on finding and reading the ledger.
const QuickAddTemplates = ({ onUse, onClose }: Props) => {
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

export default QuickAddTemplates;
