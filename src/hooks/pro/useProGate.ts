import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/useToast';
import { useIsPro } from '@/hooks/useIsPro';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import { PRO_GATES, isCapGate, type ProGateName } from '@/lib/proGates';

type AllowOptions = {
  // Runs just before the upsell when the action is blocked — closing a popover
  // that would otherwise sit on top of the upgrade dialog, for example.
  onBlock?: () => void;
};

// The one way to ask "can this user do X?". Every gated action used to spell
// out the same three steps — check the plan, toast the limit, open the
// upgrade flow — at its own call site.
export const useProGate = () => {
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();
  const { t } = useTranslation();

  // True when the action may proceed. When it may not, this explains the limit
  // (where the gate has a message) and opens the upgrade flow, so callers read
  // as `if (!allow('accounts', accounts.length)) return;`.
  const allow = useCallback(
    (
      name: ProGateName,
      currentCount: number = 0,
      options: AllowOptions = {},
    ): boolean => {
      if (isPro) {
        return true;
      }

      const gate = PRO_GATES[name];
      if (isCapGate(gate) && currentCount < gate.limit) {
        return true;
      }

      options.onBlock?.();

      // Cap gates interpolate their limit; pro-only gates just name the
      // feature. Either way the user is told what was blocked before the
      // upgrade dialog asks them for money.
      if (isCapGate(gate)) {
        toast({ title: t(gate.messageKey, { limit: gate.limit }) });
      } else if (gate.messageKey) {
        toast({ title: t(gate.messageKey) });
      }

      openUpgrade();

      return false;
    },
    [isPro, openUpgrade, t],
  );

  return { isPro, allow };
};
