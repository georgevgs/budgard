import { useTranslation } from 'react-i18next';
import Delete from 'lucide-react/dist/esm/icons/delete';
import { haptics } from '@/lib/haptics';
import type { AmountPad } from '@/hooks/expenseForm/useAmountPad';

type Props = {
  pad: AmountPad;
};

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// A keypad rather than the OS keyboard: the numeric keyboard on iOS still
// carries a decimal key and a locale separator the user has to think about,
// and it eats half the screen so the category grid below never fits.
//
// It is named as a keypad rather than as "Amount" — the form's amount field
// carries that name, and two controls sharing one accessible name is
// ambiguous to a screen reader as well as to a test.
const AmountKeypad = ({ pad }: Props) => {
  const { t } = useTranslation();

  const press = (digit: number) => {
    haptics.selection();
    pad.press(digit);
  };

  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="group"
      aria-label={t('expenses.pad.label')}
    >
      {DIGITS.map((digit) => (
        <KeypadButton key={digit} label={String(digit)} onPress={() => press(digit)} />
      ))}
      <span aria-hidden="true" />
      <KeypadButton label="0" onPress={() => press(0)} />
      <KeypadButton
        label={t('expenses.pad.backspace')}
        onPress={() => {
          haptics.light();
          pad.backspace();
        }}
        icon
      />
    </div>
  );
};

export default AmountKeypad;

// --- Helpers ---

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: boolean;
};

const KeypadButton = ({ label, onPress, icon }: ButtonProps) => (
  <button
    type="button"
    onClick={onPress}
    aria-label={label}
    className="flex h-14 items-center justify-center rounded-2xl bg-muted/60 type-figure transition-colors active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    {renderFace(label, icon)}
  </button>
);

const renderFace = (label: string, icon: boolean | undefined) => {
  if (icon) {
    return <Delete className="h-6 w-6" aria-hidden="true" />;
  }

  return label;
};
