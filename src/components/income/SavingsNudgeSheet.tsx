import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PiggyBank from 'lucide-react/dist/esm/icons/piggy-bank';
import { dataService } from '@/services/dataService';
import { useDataOperations } from '@/hooks/useDataOperations';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { Expense } from '@/types/Expense';

const PRESET_PERCENTAGES = [10, 20, 30, 50];

type Props = {
  income: Expense;
  open: boolean;
  onClose: () => void;
};

const SavingsNudgeSheet = ({ income, open, onClose }: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency, defaultSavingsPct, setIncomes } = useData();
  const { handleSavingsPctUpdate } = useDataOperations();

  const initialPct = defaultSavingsPct ?? 20;
  const [pct, setPct] = useState(initialPct);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset when sheet reopens for a different income
  useEffect(() => {
    if (open) {
      setPct(defaultSavingsPct ?? 20);
      setSetAsDefault(false);
    }
  }, [open, defaultSavingsPct]);

  const allocation = calculateAllocation(income.amount, pct);

  const handleAllocate = async () => {
    setIsSaving(true);
    try {
      const updated = await dataService.updateIncome(
        { savings_allocation_amount: allocation },
        income.id,
      );

      // Sync local state — the income row now has the savings allocation
      setIncomes((prev) => prev.map((i) => (i.id === income.id ? updated : i)));

      // Optionally save as default
      if (setAsDefault && pct !== defaultSavingsPct) {
        await handleSavingsPctUpdate(pct);
      }

      haptics.success();
      onClose();
    } catch {
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    haptics.light();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleSkip()}>
      <DialogContent
        className="sm:max-w-[440px] p-0 gap-0 [&>button]:hidden"
        onOpenChange={onClose}
      >
        <div
          className="flex justify-center pt-3 pb-2 sm:hidden"
          data-drag-handle
        >
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-2 sm:pt-5">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-income/10 flex items-center justify-center shrink-0">
                <PiggyBank className="h-5 w-5 text-income" />
              </div>
              <DialogTitle className="text-lg">
                {t('income.nudge.title')}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              {t('income.nudge.description', {
                amount: formatCurrency(income.amount, defaultCurrency),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-5">
            {/* Allocation preview */}
            <div className="rounded-2xl bg-income/5 border border-income/20 p-4">
              <p className="text-xs text-muted-foreground mb-1">
                {t('income.nudge.allocationLabel', { pct })}
              </p>
              <p className="text-2xl font-bold tabular-nums text-income">
                {formatCurrency(allocation, defaultCurrency)}
              </p>
            </div>

            {/* Percentage presets */}
            <div className="flex flex-wrap gap-2">
              {PRESET_PERCENTAGES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPct(preset)}
                  className={cn(
                    'flex-1 min-w-[60px] py-2 rounded-xl text-sm font-medium transition-colors',
                    pct === preset
                      ? 'bg-income text-income-foreground'
                      : 'bg-muted/50 hover:bg-muted',
                  )}
                >
                  {preset}%
                </button>
              ))}
            </div>

            {/* Custom percentage input */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (Number.isNaN(value)) {
                    setPct(0);
                    return;
                  }
                  setPct(Math.min(100, Math.max(0, value)));
                }}
                className="w-24 text-center font-medium"
                aria-label={t('income.nudge.customPct')}
              />
              <span className="text-sm text-muted-foreground">%</span>
              <span className="text-sm text-muted-foreground ml-auto">
                {t('income.nudge.ofIncome')}
              </span>
            </div>

            {/* Set as default toggle */}
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              {t('income.nudge.setAsDefault')}
            </label>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleSkip}>
                {t('income.nudge.skip')}
              </Button>
              <Button
                type="button"
                onClick={handleAllocate}
                disabled={isSaving || pct === 0}
                className="bg-income text-income-foreground hover:bg-income/90"
              >
                {renderAllocateLabel(isSaving, t)}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SavingsNudgeSheet;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export const calculateAllocation = (amount: number, pct: number): number => {
  if (pct <= 0) return 0;

  return Math.round(((amount * pct) / 100) * 100) / 100;
};

const renderAllocateLabel = (isSaving: boolean, t: TranslateFunction) => {
  if (isSaving) return t('common.saving');

  return t('income.nudge.allocate');
};
