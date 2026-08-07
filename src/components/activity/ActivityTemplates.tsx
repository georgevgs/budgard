import TemplatesBar from '@/components/expenses/TemplatesBar';
import { useDataConfig, useTemplatesData } from '@/contexts/DataContext';
import { useTemplateOps } from '@/hooks/dataOps/useTemplateOps';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';

type Props = {
  onUse: (template: ExpenseTemplate) => void;
};

// Templates are saved from a row's overflow menu in this same feed, so the bar
// that spends them belongs here too — saving somewhere you can never spend it
// is a dead end. Owns its own data so ActivityView doesn't have to thread
// templates and the delete op through.
const ActivityTemplates = ({ onUse }: Props) => {
  const templates = useTemplatesData();
  const { defaultCurrency } = useDataConfig();
  const { handleTemplateDelete } = useTemplateOps();

  return (
    <TemplatesBar
      templates={templates}
      defaultCurrency={defaultCurrency}
      onUse={onUse}
      onDelete={handleTemplateDelete}
    />
  );
};

export default ActivityTemplates;
