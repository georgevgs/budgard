import { useTranslation } from 'react-i18next';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import CircleAlert from 'lucide-react/dist/esm/icons/circle-alert';
import Compass from 'lucide-react/dist/esm/icons/compass';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import { cn } from '@/lib/utils';
import type { TodayStatus } from '@/hooks/today/useTodayGuidance';

type Props = {
  status: TodayStatus;
};

// The state is never carried by colour alone — this chip names it in words and
// an icon as well. It used to be a white pill on a tinted hero; the hero is a
// plain card now, so the chip carries the tone itself: a tint of the status
// hue behind its own ink, which is the one pairing that stays legible on both
// canvases without a second set of dark-mode values.
const TodayStatusChip = ({ status }: Props) => {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.08em]',
        getStatusTone(status),
      )}
    >
      {renderStatusIcon(status)}
      {t(`today.chip.${status}`)}
    </span>
  );
};

export default TodayStatusChip;

// --- Helpers ---

// Matches the ring `.today-hero-*` draws around the card, so the chip and the
// edge always name the same state.
const getStatusTone = (status: TodayStatus): string => {
  if (status === 'tight') {
    return 'bg-destructive/12 text-destructive-ink';
  }
  if (status === 'watchful') {
    return 'bg-warning/15 text-warning-ink';
  }
  if (status === 'noBudget') {
    return 'bg-muted text-muted-foreground';
  }

  return 'bg-primary/12 text-primary-ink';
};

const renderStatusIcon = (status: TodayStatus) => {
  const Icon = getStatusIcon(status);

  return <Icon className="h-3.5 w-3.5" />;
};

const getStatusIcon = (status: TodayStatus) => {
  if (status === 'tight') {
    return CircleAlert;
  }
  if (status === 'watchful') {
    return TrendingUp;
  }
  if (status === 'noBudget') {
    return Compass;
  }

  return CircleCheck;
};
