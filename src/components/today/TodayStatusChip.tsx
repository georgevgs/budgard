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

// The hero's four tones all sit in the same warm family, so the state is
// never carried by colour alone — this chip names it in words and an icon.
const TodayStatusChip = ({ status }: Props) => {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.08em]',
        'bg-white/55 text-current ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10',
      )}
    >
      {renderStatusIcon(status)}
      {t(`today.chip.${status}`)}
    </span>
  );
};

export default TodayStatusChip;

// --- Helpers ---

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
