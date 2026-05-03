import { useTranslation } from 'react-i18next';
import { el, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';

export const useDateLocale = (): Locale => {
  const { i18n } = useTranslation();

  if (i18n.language === 'el') {
    return el;
  }

  return enUS;
};
