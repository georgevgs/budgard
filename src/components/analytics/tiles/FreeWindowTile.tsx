import { useTranslation } from 'react-i18next';
import Lock from 'lucide-react/dist/esm/icons/lock';
import BentoTile from '@/components/bento/BentoTile';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { useIsPro } from '@/hooks/useIsPro';

// Free analytics cover only the last three months (see useAnalyticsData), yet
// the screen still frames a whole year. Saying so at the top of the grid, next
// to the numbers it limits, is more honest than an upsell card further down
// — and it is an outline rather than a fill, because a locked thing should
// read as a slot you have not filled yet, not as another module.
const FreeWindowTile = () => {
  const { t } = useTranslation();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();

  if (isPro) {
    return null;
  }

  return (
    <BentoTile
      wide
      tone="ghost"
      onClick={() => openUpgrade()}
      ariaLabel={t('pro.gate.analyticsWindow')}
      className="flex items-center gap-3 px-4.5 py-3.5"
    >
      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 text-[0.78rem] leading-snug text-muted-foreground">
        {t('pro.gate.analyticsWindow')}
      </span>
    </BentoTile>
  );
};

export default FreeWindowTile;
