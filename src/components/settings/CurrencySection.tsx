import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataConfig } from '@/contexts/DataContext';
import { useSettingsOps } from '@/hooks/dataOps/useSettingsOps';
import { useToast } from '@/hooks/useToast';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';

const CurrencySection = () => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const { handleCurrencyUpdate } = useSettingsOps();
  const { toast } = useToast();
  const [isCurrencyUpdating, setIsCurrencyUpdating] = useState(false);

  const handleCurrencyChange = async (currency: string) => {
    setIsCurrencyUpdating(true);
    try {
      await handleCurrencyUpdate(currency);
      toast({ title: t('settings.currency.updated') });
    } catch {
      toast({
        title: t('settings.currency.updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsCurrencyUpdating(false);
    }
  };

  return (
    <section className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {t('settings.currency.title')}
      </p>
      <Card>
        <CardContent className="p-4 space-y-1">
          <p className="text-sm">{t('settings.currency.default')}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {t('settings.currency.defaultDescription')}
          </p>
          <Select
            value={defaultCurrency}
            onValueChange={handleCurrencyChange}
            disabled={isCurrencyUpdating}
          >
            <SelectTrigger>
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
        </CardContent>
      </Card>
    </section>
  );
};

export default CurrencySection;
