import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { haptics } from '@/lib/haptics';
import { setPin, PIN_LENGTH } from '@/lib/appLock';

type Params = {
  isOpen: boolean;
  onSaved: () => void;
};

export const useSetPin = ({ isOpen, onSaved }: Params) => {
  const { t } = useTranslation();
  const [first, setFirst] = useState('');
  const [entry, setEntry] = useState('');
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);

  // Reopening starts over. Recorded during render so the first frame after
  // opening never shows a half-typed PIN from last time.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setFirst('');
      setEntry('');
      setMessage('');
      setHasError(false);
    }
  }

  const complete = async (candidate: string) => {
    if (first === '') {
      setFirst(candidate);
      setEntry('');

      return;
    }

    if (candidate !== first) {
      haptics.error();
      setHasError(true);
      setMessage(t('security.setPin.mismatch'));
      window.setTimeout(() => {
        setFirst('');
        setEntry('');
        setHasError(false);
      }, 700);

      return;
    }

    await setPin(candidate);
    haptics.success();
    onSaved();
  };

  const press = (digit: number) => {
    if (hasError) {
      return;
    }

    haptics.selection();
    const next = `${entry}${digit}`;
    setEntry(next);
    setMessage('');

    if (next.length === PIN_LENGTH) {
      void complete(next);
    }
  };

  return {
    entry,
    message,
    hasError,
    step: stepFor(first),
    press,
    backspace: () => setEntry((current) => current.slice(0, -1)),
  };
};

// --- Helpers ---

const stepFor = (first: string): 'choose' | 'confirm' => {
  if (first === '') {
    return 'choose';
  }

  return 'confirm';
};
