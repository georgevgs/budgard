import { createContext, useContext, useEffect } from 'react';

type SetDialogDirty = (dirty: boolean) => void;

// Provided by DialogContent; forms report their dirty state through it so the
// dialog can ask for confirmation before an implicit dismissal (swipe, Esc,
// overlay tap, X) throws away unsaved changes.
export const DialogDirtyContext = createContext<SetDialogDirty | null>(null);

export const useDialogDirty = (isDirty: boolean): void => {
  const setDirty = useContext(DialogDirtyContext);

  useEffect(() => {
    if (!setDirty) {
      return;
    }
    setDirty(isDirty);

    return () => setDirty(false);
  }, [isDirty, setDirty]);
};
