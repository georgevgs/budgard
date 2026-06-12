import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FORM_TYPES, type FormType } from '@/components/layout/FormsManager';

// Open add-expense form when navigated with ?action=add (e.g. from push notification)
export const useOpenFormFromUrl = (
  isInitialized: boolean,
  setFormType: (formType: FormType) => void,
) => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!isInitialized) return;
    if (searchParams.get('action') !== 'add') return;

    setFormType(FORM_TYPES.NEW_EXPENSE);
    setSearchParams({}, { replace: true });
  }, [isInitialized, searchParams, setSearchParams, setFormType]);
};
