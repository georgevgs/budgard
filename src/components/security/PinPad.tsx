import { useTranslation } from 'react-i18next';
import Delete from 'lucide-react/dist/esm/icons/delete';

type Props = {
  onPress: (digit: number) => void;
  onBackspace: () => void;
  disabled?: boolean;
};

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Its own component rather than the expense keypad: that one models an amount
// filling from the right and carries currency formatting with it. Sharing them
// would mean a single component that is sometimes about money and sometimes
// about a passcode, which is how both end up serving neither well.
const PinPad = ({ onPress, onBackspace, disabled }: Props) => {
  const { t } = useTranslation();

  return (
    <div
      className="grid w-full max-w-[17rem] grid-cols-3 gap-3"
      role="group"
      aria-label={t('security.lock.padLabel')}
    >
      {DIGITS.map((digit) => (
        <PadButton
          key={digit}
          label={String(digit)}
          disabled={disabled}
          onPress={() => onPress(digit)}
        />
      ))}
      <span aria-hidden="true" />
      <PadButton label="0" disabled={disabled} onPress={() => onPress(0)} />
      <PadButton
        label={t('security.lock.backspace')}
        disabled={disabled}
        onPress={onBackspace}
        icon
      />
    </div>
  );
};

export default PinPad;

// --- Helpers ---

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: boolean;
};

const PadButton = ({ label, onPress, disabled, icon }: ButtonProps) => (
  <button
    type="button"
    onClick={onPress}
    disabled={disabled}
    aria-label={label}
    className="flex h-16 items-center justify-center rounded-full bg-muted/60 font-display text-2xl font-semibold tabular-nums transition-colors active:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
