import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import Tag from 'lucide-react/dist/esm/icons/tag';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import SpeedDialAction from '@/components/layout/SpeedDialAction';

type SpeedDialProps = {
  onAddExpense: () => void;
  onAddCategory: () => void;
}

const SpeedDial = ({ onAddExpense, onAddCategory }: SpeedDialProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    haptics.light();
    setIsOpen(!isOpen);
  };

  const closeMenu = useCallback(() => setIsOpen(false), []);

  const handleAction = (callback: () => void) => {
    haptics.light();
    closeMenu();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    callback();
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeMenu]);

  return (
    <>
      {renderOverlay(isOpen, closeMenu)}

      <div
        data-dock-action
        className="fixed bottom-(--dock-bottom) right-(--dock-edge) z-50 flex flex-col items-end gap-2 pointer-events-none"
      >
        {/* Action Buttons */}
        <div
          aria-hidden={!isOpen}
          className={cn(
            'flex flex-col gap-2 items-end transition-all duration-200 scale-90 origin-bottom pointer-events-auto',
            isOpen && 'opacity-100 translate-y-0',
            !isOpen && 'opacity-0 -translate-y-4 pointer-events-none',
          )}
        >
          <SpeedDialAction
            isOpen={isOpen}
            label={t('expenses.addExpense')}
            icon={<Receipt className="h-5 w-5" />}
            onClick={() => handleAction(onAddExpense)}
            labelDelayClass="delay-100"
          />

          <SpeedDialAction
            isOpen={isOpen}
            label={t('categories.addCategory')}
            icon={<Tag className="h-5 w-5" />}
            onClick={() => handleAction(onAddCategory)}
          />
        </div>

        {/* Main Toggle Button */}
        <Button
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full shadow-lg shadow-primary/30 transition-transform duration-200 pointer-events-auto',
            isOpen && 'rotate-45',
          )}
          onClick={toggleMenu}
          aria-label={getToggleLabel(isOpen, t)}
          aria-expanded={isOpen}
        >
          {renderToggleIcon(isOpen)}
        </Button>
      </div>
    </>
  );
};

export default SpeedDial;

// ─── Helper render functions ──────────────────────────────────────────────────

const renderOverlay = (isOpen: boolean, onClose: () => void) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-transparent z-40"
      onClick={onClose}
      role="presentation"
    />
  );
};

const renderToggleIcon = (isOpen: boolean) => {
  if (isOpen) return <X className="h-6 w-6" />;

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
