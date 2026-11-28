import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Emoji3D from '@/common/components/common/Emoji3D/Emoji3D';
import { useQuickAdd } from '@/common/contexts/QuickAddContext';
import { haptics } from '@/constants/haptics';

// The row of actions under the headline figure, each a 3D object in a quiet
// round tile over its label. Logging is one tap from here, and
// so are the two places a month gets planned around.
const TodayActions = () => {
  const { t } = useTranslation();
  const { openExpenseEntry, openIncomeEntry } = useQuickAdd();

  return (
    <div
      role="group"
      aria-label={t('today.actions.ariaLabel')}
      className="bento-wide grid grid-cols-4 gap-2 px-1 pt-1 pb-2"
    >
      <ActionButton
        emoji="🧾"
        label={t('today.actions.expense')}
        onPress={openExpenseEntry}
      />
      <ActionButton
        emoji="💶"
        label={t('today.actions.income')}
        onPress={openIncomeEntry}
      />
      <ActionLink
        emoji="🗓️"
        label={t('navigation.recurring')}
        to="/recurring"
      />
      <ActionLink emoji="🎯" label={t('navigation.goals')} to="/goals" />
    </div>
  );
};

export default TodayActions;

const ACTION_CLASS_NAME =
  'group flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-2xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const TILE_CLASS_NAME =
  'object-tile flex h-13 w-13 items-center justify-center rounded-full';

const OBJECT_CLASS_NAME = 'object-press h-7.5 w-7.5';

const LABEL_CLASS_NAME =
  'w-full truncate text-center text-xs font-semibold text-foreground';

const ActionButton = ({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) => {
  const handleClick = () => {
    haptics.light();
    onPress();
  };

  return (
    <button type="button" onClick={handleClick} className={ACTION_CLASS_NAME}>
      <span aria-hidden="true" className={TILE_CLASS_NAME}>
        <Emoji3D emoji={emoji} className={OBJECT_CLASS_NAME} />
      </span>
      <span className={LABEL_CLASS_NAME}>{label}</span>
    </button>
  );
};

const ActionLink = ({
  emoji,
  label,
  to,
}: {
  emoji: string;
  label: string;
  to: string;
}) => {
  return (
    <Link
      to={to}
      viewTransition
      onClick={() => haptics.selection()}
      className={ACTION_CLASS_NAME}
    >
      <span aria-hidden="true" className={TILE_CLASS_NAME}>
        <Emoji3D emoji={emoji} className={OBJECT_CLASS_NAME} />
      </span>
      <span className={LABEL_CLASS_NAME}>{label}</span>
    </Link>
  );
};
