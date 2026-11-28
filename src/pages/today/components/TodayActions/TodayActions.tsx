import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import Target from 'lucide-react/dist/esm/icons/target';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import { useQuickAdd } from '@/common/contexts/QuickAddContext';
import { haptics } from '@/constants/haptics';

type ActionIcon = ComponentType<{ className?: string }>;

// The row of round actions under the headline figure. Logging is one tap from
// here, and so are the two places a month gets planned around.
const TodayActions = () => {
  const { t } = useTranslation();
  const { openExpenseEntry, openIncomeEntry } = useQuickAdd();

  return (
    <nav
      aria-label={t('today.actions.ariaLabel')}
      className="bento-wide grid grid-cols-4 gap-2 px-1 pt-1 pb-2"
    >
      <ActionButton
        icon={Receipt}
        label={t('today.actions.expense')}
        onPress={openExpenseEntry}
      />
      <ActionButton
        icon={TrendingUp}
        label={t('today.actions.income')}
        onPress={openIncomeEntry}
      />
      <ActionLink
        icon={Repeat}
        label={t('navigation.recurring')}
        to="/recurring"
      />
      <ActionLink icon={Target} label={t('navigation.goals')} to="/goals" />
    </nav>
  );
};

export default TodayActions;

const ACTION_CLASS_NAME =
  'group flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-2xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const DISC_CLASS_NAME =
  'flex h-13 w-13 items-center justify-center rounded-full bg-muted text-foreground transition-transform group-active:scale-90 motion-reduce:group-active:scale-100';

const LABEL_CLASS_NAME =
  'w-full truncate text-center text-xs font-semibold text-foreground';

const ActionButton = ({
  icon: Icon,
  label,
  onPress,
}: {
  icon: ActionIcon;
  label: string;
  onPress: () => void;
}) => {
  const handleClick = () => {
    haptics.light();
    onPress();
  };

  return (
    <button type="button" onClick={handleClick} className={ACTION_CLASS_NAME}>
      <span aria-hidden="true" className={DISC_CLASS_NAME}>
        <Icon className="h-5 w-5" />
      </span>
      <span className={LABEL_CLASS_NAME}>{label}</span>
    </button>
  );
};

const ActionLink = ({
  icon: Icon,
  label,
  to,
}: {
  icon: ActionIcon;
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
      <span aria-hidden="true" className={DISC_CLASS_NAME}>
        <Icon className="h-5 w-5" />
      </span>
      <span className={LABEL_CLASS_NAME}>{label}</span>
    </Link>
  );
};
