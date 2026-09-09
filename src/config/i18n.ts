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

const initialLang = detectInitialLanguage();

// init() runs here, synchronously and with no bundle yet. That is the point:
// main.tsx used to hold createRoot() until the translations had downloaded and
// parsed, which put a whole round trip in front of the mount and left the auth
// check, the shell chunk and the boot fetch queued behind a JSON file. Now the
// tree mounts immediately and the locale arrives alongside them.
//
// Nothing renders a raw key in the meantime: App holds its loading skeleton
// until i18nReady resolves. useSuspense is off for the same reason — this
// module owns the loading state, and react-i18next suspending on a tree with
// no boundary around it would trade a missing string for a blank screen.
//
// i18next has no backend plugin here, so init needs no I/O and the store is
// usable the moment this module finishes evaluating.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {},
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
    react: {
      useSuspense: false,
    },
  });

// Keep <html lang> in sync so screen readers use the right pronunciation.
// constants/utils.ts reads it for number formatting, so it is set before the
// first render rather than after the bundle lands.
document.documentElement.lang = initialLang;

const handleLanguageChanged = async (lng: string) => {
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
};

const loadInitialBundle = async (): Promise<void> => {
  const translation = await loadTranslation(initialLang);
  i18n.addResourceBundle(initialLang, 'translation', translation);
  // Re-announcing the language is what tells react-i18next to repaint anything
  // already mounted; addResourceBundle on its own is silent.
  await i18n.changeLanguage(initialLang);
  // Registered only now, so the initial load does not trip the handler's own
  // "bundle missing" branch and fetch the same file twice.
  i18n.on('languageChanged', handleLanguageChanged);
};

export const i18nReady = loadInitialBundle();

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
