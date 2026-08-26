import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  value: string;
  isDirty: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
};

// Notes stay compact until the person asks to change one. An empty three-line
// field made the detail screen look unfinished and pushed the useful context
// below it; the summary keeps that space proportional to what is actually in
// the transaction.
const TransactionNote = ({ value, isDirty, onChange, onSave }: Props) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);

  const handleDone = () => {
    setIsEditing(false);
  };

  if (!isEditing) {
    return renderSummary(value, () => setIsEditing(true), t);
  }

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
        onBlur={() => void onSave()}
        placeholder={t('transaction.note.placeholder')}
        rows={3}
        autoFocus
        className="resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        {renderHint(isDirty, t)}
        <button
          type="button"
          onClick={handleDone}
          className="ml-auto min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('transaction.note.done')}
        </button>
      </div>
    </section>
  );
};

export default TransactionNote;

// --- Helpers ---

type TFunc = (key: string) => string;

const renderSummary = (value: string, onEdit: () => void, t: TFunc) => {
  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t('transaction.note.label')}
      </p>
      <button
        type="button"
        onClick={onEdit}
        className="tile flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={resolveSummaryClass(value)}>
          {resolveSummary(value, t)}
        </span>
        <Pencil
          className="ml-auto h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </button>
    </section>
  );
};

const resolveSummary = (value: string, t: TFunc): string => {
  if (value.trim().length === 0) {
    return t('transaction.note.add');
  }

  return value;
};

const resolveSummaryClass = (value: string): string => {
  if (value.trim().length === 0) {
    return 'text-sm font-medium text-primary-ink';
  }

  return 'line-clamp-2 text-sm leading-relaxed';
};

const renderHint = (isDirty: boolean, t: TFunc) => {
  if (!isDirty) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground" role="status">
      {t('transaction.note.unsaved')}
    </p>
  );
};
