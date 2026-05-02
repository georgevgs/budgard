import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const SUPPORTED = ['en', 'el'] as const;
type Lang = (typeof SUPPORTED)[number];

const isSupported = (value: string): value is Lang => {
  return (SUPPORTED as readonly string[]).includes(value);
};

const detectInitialLanguage = (): Lang => {
  const stored = localStorage.getItem('i18nextLng');
  if (stored && isSupported(stored)) {
    return stored;
  }

  const navLang = navigator.language.split('-')[0];
  if (navLang && isSupported(navLang)) {
    return navLang;
  }

  return 'en';
};

const loadTranslation = async (lang: Lang): Promise<Record<string, unknown>> => {
  const mod = await import(`../locales/${lang}/translation.json`);

  return mod.default;
};

const initI18n = async (): Promise<void> => {
  const initialLang = detectInitialLanguage();
  const initialTranslation = await loadTranslation(initialLang);

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        [initialLang]: { translation: initialTranslation },
      },
      lng: initialLang,
      fallbackLng: 'en',
      supportedLngs: SUPPORTED as unknown as string[],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
    });

  i18n.on('languageChanged', async (lng) => {
    if (!isSupported(lng)) {
      return;
    }

    if (i18n.hasResourceBundle(lng, 'translation')) {
      return;
    }

    const translation = await loadTranslation(lng);
    i18n.addResourceBundle(lng, 'translation', translation);
  });
};

export const i18nReady = initI18n();

export default i18n;
