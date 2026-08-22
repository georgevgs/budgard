import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PinPad from '@/components/security/PinPad';
import { useSetPin } from '@/hooks/security/useSetPin';
import { PIN_LENGTH } from '@/lib/appLock';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

// Two passes: choose, then repeat. A single-entry PIN is one slip away from
// locking someone out of their own app with no way to discover the typo.
const SetPinDialog = ({ open, onClose, onSaved }: Props) => {
  const { t } = useTranslation();
  const form = useSetPin({ isOpen: open, onSaved });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[380px]" onOpenChange={onClose}>
        <DialogHeader className="pr-10" data-draggable-area>
          <DialogTitle>{t(`security.setPin.${form.step}Title`)}</DialogTitle>
          <DialogDescription>
            {t('security.setPin.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col items-center gap-5 pb-2">
            <div className="flex gap-3" aria-hidden="true">
              {Array.from({ length: PIN_LENGTH }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-3.5 w-3.5 rounded-full transition-colors',
                    dotTone(index < form.entry.length, form.hasError),
                  )}
                />
              ))}
            </div>
            <p
              className="min-h-5 text-center text-sm font-medium text-destructive-ink"
              role="alert"
            >
              {form.message}
            </p>
            <PinPad onPress={form.press} onBackspace={form.backspace} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SetPinDialog;

// --- Helpers ---

const dotTone = (filled: boolean, hasError: boolean): string => {
  if (hasError) {
    return 'bg-destructive';
  }
  if (filled) {
    return 'bg-foreground';
  }

  return 'bg-muted-foreground/25';
};
