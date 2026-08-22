import { useTranslation } from 'react-i18next';
import SurfaceCard from '@/components/common/SurfaceCard';
import ConfirmDestructiveDialog from '@/components/common/ConfirmDestructiveDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataConfig } from '@/contexts/DataContext';
import { useCurrencyChange } from '@/hooks/settings/useCurrencyChange';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';

// Changing the default currency re-labels every stored amount; it does not
// convert them. Switching EUR to JPY turns a 4,50 coffee into ¥4,50 — the
// whole ledger restated by a factor of ~160 in one tap. The numbers are the
// user's to keep or re-enter, but the consequence has to be stated before it
// happens rather than discovered afterwards.
const CurrencySection = () => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const currency = useCurrencyChange();

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t('settings.currency.title')}
      </p>
      <SurfaceCard>
        <div className="p-4 space-y-1">
          <p className="text-sm">{t('settings.currency.default')}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {t('settings.currency.defaultDescription')}
          </p>
          <Select
            value={defaultCurrency}
            onValueChange={currency.request}
            disabled={currency.isUpdating}
          >
            <SelectTrigger aria-label={t('settings.currency.default')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground pt-2">
            {t('settings.currency.noConversionNote')}
          </p>
        </div>
      </SurfaceCard>

      <ConfirmDestructiveDialog
        open={currency.pending !== null}
        title={t('settings.currency.confirmTitle')}
        description={t('settings.currency.confirmDescription', {
          from: defaultCurrency,
          to: currency.pending ?? '',
        })}
        confirmLabel={t('settings.currency.confirmAction', {
          currency: currency.pending ?? '',
        })}
        onOpenChange={currency.dismiss}
        onConfirm={currency.confirm}
      />
    </section>
  );
};

export default CurrencySection;
