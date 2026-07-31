import { useTranslation } from 'react-i18next';
import Crown from 'lucide-react/dist/esm/icons/crown';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Top of the paywall sheet: a warm glow behind a crown tile, the Pro
// wordmark, and the one-line pitch.
const PaywallHero = () => {
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-col items-center gap-3 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
      />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/75 text-primary-foreground shadow-lg shadow-primary/30">
        <Crown className="h-7 w-7" />
      </div>
      <div className="relative space-y-1.5">
        <DialogTitle className="text-2xl font-bold tracking-tight">
          {t('pro.heroTitle')}
        </DialogTitle>
        <DialogDescription className="mx-auto max-w-[280px] text-sm leading-relaxed">
          {t('pro.dialogSubtitle')}
        </DialogDescription>
      </div>
    </div>
  );
};

export default PaywallHero;
