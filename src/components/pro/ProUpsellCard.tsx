import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { useTranslation } from 'react-i18next';
import SurfaceCard from '@/components/common/SurfaceCard';
import { Button } from '@/components/ui/button';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';

type Props = {
  title: string;
  description: string;
};

// A gate should read as an offer, not a locked door. This used to borrow
// EmptyStateCard, which meant every Pro gate in the app showed a grey padlock
// above a button captioned "+ Upgrade to Pro" — the plus belongs to "add a
// thing", and the padlock frames the whole product as withheld. Same
// information, stated as what you get.
const ProUpsellCard = ({ title, description }: Props) => {
  const { t } = useTranslation();
  const { openUpgrade } = useUpgradeDialog();

  return (
    <SurfaceCard className="p-6">
      <div className="flex flex-col items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold tracking-[-0.02em]">
            {title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {/* Wrapped, not passed by reference: onClick would hand openUpgrade a
            MouseEvent as its optional `plan` argument. */}
        <Button onClick={() => openUpgrade()} size="sm" className="mt-1">
          {t('pro.upgradeTitle')}
        </Button>
      </div>
    </SurfaceCard>
  );
};

export default ProUpsellCard;
