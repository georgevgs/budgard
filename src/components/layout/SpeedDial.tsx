import { useTranslation } from 'react-i18next';
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type RefObject,
} from 'react';
import { Button } from '@/components/ui/button';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import SpeedDialAction from '@/components/layout/SpeedDialAction';

// The two things a money app is for. Both are always present: this used to
// hand out different actions per screen — income only on Activity, plus a
// "New category" entry ranked as a peer of the daily ones — so the same
// button did different things depending on where you tapped it, and most
// people never found income at all. Category management now lives inside the
// expense form's category picker, where you actually need it.
type SpeedDialProps = {
  onAddExpense: () => void;
  onAddIncome: () => void;
};

const SpeedDial = ({ onAddExpense, onAddIncome }: SpeedDialProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => {
    haptics.light();
    setIsOpen((open) => !open);
  };

  const closeMenu = useCallback(() => setIsOpen(false), []);

  const closeMenuAndRestoreFocus = useCallback(() => {
    closeMenu();
    window.requestAnimationFrame(() => toggleButtonRef.current?.focus());
  }, [closeMenu]);

  useSpeedDialFocus(isOpen, actionsRef, closeMenuAndRestoreFocus);

  const handleAction = (callback: () => void) => {
    haptics.light();
    closeMenu();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    callback();
  };

  return (
    <>
      <SpeedDialOverlay isOpen={isOpen} onClose={closeMenuAndRestoreFocus} />

      <div
        data-dock-action
        className="fixed bottom-(--dock-bottom) right-(--dock-edge) z-50 flex flex-col items-end gap-2 pointer-events-none"
      >
        {/* Action Buttons */}
        <div
          id="speed-dial-actions"
          ref={actionsRef}
          aria-hidden={!isOpen}
          className={getActionsClass(isOpen)}
        >
          <SpeedDialAction
            isOpen={isOpen}
            label={t('expenses.addExpense')}
            icon={<Receipt className="h-5 w-5" />}
            onClick={() => handleAction(onAddExpense)}
            labelDelayClass="delay-75"
          />

          <SpeedDialAction
            isOpen={isOpen}
            label={t('income.addIncome')}
            icon={<TrendingUp className="h-5 w-5" />}
            onClick={() => handleAction(onAddIncome)}
          />
        </div>

        {/* Main Toggle Button */}
        <Button
          ref={toggleButtonRef}
          size="icon"
          className={getToggleClass(isOpen)}
          onClick={toggleMenu}
          aria-label={getToggleLabel(isOpen, t)}
          aria-expanded={isOpen}
          aria-controls="speed-dial-actions"
        >
          {renderToggleIcon(isOpen)}
        </Button>
      </div>
    </>
  );
};

export default SpeedDial;

// ─── Helper render functions ──────────────────────────────────────────────────

const useSpeedDialFocus = (
  isOpen: boolean,
  actionsRef: RefObject<HTMLDivElement | null>,
  closeMenuAndRestoreFocus: () => void,
) => {
  // A disclosed action menu should continue the keyboard sequence at its
  // first action, then return to the trigger when dismissed.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const firstAction = actionsRef.current?.querySelector<HTMLButtonElement>(
        'button:not([tabindex="-1"])',
      );
      firstAction?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [actionsRef, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenuAndRestoreFocus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeMenuAndRestoreFocus]);
};

type OverlayProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SpeedDialOverlay = ({ isOpen, onClose }: OverlayProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-transparent z-40"
      onClick={onClose}
      role="presentation"
    />
  );
};

const renderToggleIcon = (isOpen: boolean) => {
  if (isOpen) {
    return <X className="h-6 w-6" />;
  }

  return <Plus className="h-6 w-6" />;
};

const getToggleLabel = (
  isOpen: boolean,
  t: (key: string) => string,
): string => {
  if (isOpen) {
    return t('speedDial.close');
  }

  return t('speedDial.open');
};

const getActionsClass = (isOpen: boolean): string => {
  const base =
    'flex flex-col gap-2 items-end transition-[opacity,transform] duration-200 scale-90 origin-bottom pointer-events-auto';
  if (isOpen) {
    return cn(base, 'opacity-100 translate-y-0');
  }

  return cn(base, 'opacity-0 -translate-y-4 pointer-events-none');
};

const getToggleClass = (isOpen: boolean): string => {
  const base =
    'h-14 w-14 rounded-full shadow-lg shadow-black/10 dark:shadow-black/40 transition-transform duration-200 pointer-events-auto';
  if (isOpen) {
    return cn(base, 'rotate-45');
  }

  return base;
};

