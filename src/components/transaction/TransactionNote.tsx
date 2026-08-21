import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  value: string;
  isDirty: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
};

// A note saves when the field loses focus rather than behind a button. There
// is nothing else on this screen to submit, so a Save control would be a step
// that exists only to be tapped.
//
// The section is deliberately unnamed: it holds a single field, and labelling
// it as well would make a screen reader announce "Note, region" and then
// "Note, edit box".
const TransactionNote = ({ value, isDirty, onChange, onSave }: Props) => {
  const { t } = useTranslation();

  return (
    <section className="space-y-2">
      <label
        htmlFor="tx-note"
        className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"
      >
        {t('transaction.note.label')}
      </label>
      <Textarea
        id="tx-note"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onSave}
        placeholder={t('transaction.note.placeholder')}
        rows={3}
        className="resize-none"
      />
      {renderHint(isDirty, t)}
    </section>
  );
};

export default TransactionNote;

// --- Helpers ---

const renderHint = (
  isDirty: boolean,
  t: (key: string) => string,
) => {
  if (!isDirty) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground" role="status">
      {t('transaction.note.unsaved')}
    </p>
  );
};
