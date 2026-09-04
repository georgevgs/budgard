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

const loadTranslation = async (
  lang: Lang,
): Promise<Record<string, unknown>> => {
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

  // Keep <html lang> in sync so screen readers use the right pronunciation
  document.documentElement.lang = initialLang;

  i18n.on('languageChanged', async (lng) => {
    if (!isSupported(lng)) {
      return;
    }

    document.documentElement.lang = lng;

    if (i18n.hasResourceBundle(lng, 'translation')) {
      return;
    }

    // Reaching here means something changed the language without going through
    // changeAppLanguage below, so the bundle is arriving after the render that
    // languageChanged already triggered. addResourceBundle alone does not
    // notify react-i18next, which would leave the UI in the previous language
    // until an unrelated re-render happened to come along. Re-announcing the
    // same language once the bundle is in place is what repaints it — and it
    // cannot loop, because hasResourceBundle short-circuits the second pass.
    const translation = await loadTranslation(lng);
    i18n.addResourceBundle(lng, 'translation', translation);
    await i18n.changeLanguage(lng);
  });
};

export const i18nReady = initI18n();

// Switching language has to load that language's strings before the switch is
// announced, or every consumer renders one pass with the old bundle. Callers
// use this rather than i18n.changeLanguage directly.
export const changeAppLanguage = async (lng: string): Promise<void> => {
  if (!isSupported(lng)) {
    return;
  }

  if (!i18n.hasResourceBundle(lng, 'translation')) {
    i18n.addResourceBundle(lng, 'translation', await loadTranslation(lng));
  }

  await i18n.changeLanguage(lng);
};
