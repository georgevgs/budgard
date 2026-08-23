import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { renderSuggestionMeta } from '@/components/expenses/ExpensesForm.helpers';
import type { Expense } from '@/types/Expense';

type Props = {
  value: string;
  suggestions: Expense[];
  errorKey: string | null;
  onChange: (value: string) => void;
  onSelect: (suggestion: Expense) => void;
};

// The keypad screen used to name every expense after its category, which is
// fine for a coffee and useless for the row you go looking for later. The
// field is still optional — but the recent names are one tap, so the common
// case never needs the keyboard at all.
const QuickAddName = ({
  value,
  suggestions,
  errorKey,
  onChange,
  onSelect,
}: Props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const choose = (suggestion: Expense) => {
    onSelect(suggestion);
    setIsOpen(false);
  };

  return (
    <div>
      <Popover
        open={isListOpen(isOpen, suggestions)}
        onOpenChange={setIsOpen}
        modal={false}
      >
        <PopoverAnchor asChild>
          <Input
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            placeholder={t('expenses.quickAdd.namePlaceholder')}
            aria-label={t('expenses.quickAdd.nameLabel')}
            aria-invalid={Boolean(errorKey)}
            aria-describedby={describedBy(errorKey)}
            maxLength={100}
            autoComplete="off"
            enterKeyHint="done"
            className="h-11 rounded-xl text-center"
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={() => setIsOpen(false)}
        >
          <div className="max-h-[200px] overflow-y-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent active:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                // The blur that a tap would otherwise fire closes the popover
                // before the click lands, so the tap has to be swallowed here.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(suggestion)}
              >
                <span className="truncate">{suggestion.description}</span>
                {renderSuggestionMeta(suggestion)}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {renderError(errorKey, t)}
    </div>
  );
};

export default QuickAddName;

// --- Helpers ---

// An empty list would open a popover with nothing in it, which on a phone is
// a flash of chrome over the keypad for no reason.
const isListOpen = (isFocused: boolean, suggestions: Expense[]): boolean => {
  if (suggestions.length === 0) {
    return false;
  }

  return isFocused;
};

const describedBy = (errorKey: string | null): string | undefined => {
  if (!errorKey) {
    return undefined;
  }

  return 'quick-add-name-error';
};

const renderError = (errorKey: string | null, t: (key: string) => string) => {
  if (!errorKey) {
    return null;
  }

  return (
    <p
      id="quick-add-name-error"
      role="alert"
      className="mt-1.5 px-1 text-xs text-destructive-ink"
    >
      {t(errorKey)}
    </p>
  );
};
