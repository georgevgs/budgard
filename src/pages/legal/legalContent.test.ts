import { describe, it, expect, beforeAll } from 'vitest';
import { createInstance, type i18n as I18nInstance } from 'i18next';
import en from '@/locales/en/translation.json';
import el from '@/locales/el/translation.json';
import { SUPPORT_EMAIL } from '@/lib/legal';
import type { LegalSection } from '@/pages/legal/LegalSections';

// The legal pages rely on i18next returning structured section arrays with
// interpolation applied inside them. This exercises the real library against
// the real translation files — the global react-i18next mock does not apply
// here because we build our own instance.

let i18n: I18nInstance;

beforeAll(async () => {
  i18n = createInstance();
  await i18n.init({
    lng: 'en',
    resources: {
      en: { translation: en },
      el: { translation: el },
    },
    interpolation: { escapeValue: false },
  });
});

describe('legal content', () => {
  it('returns privacy sections as objects with the email interpolated', () => {
    const sections = i18n.t('legal.privacy.sections', {
      returnObjects: true,
      email: SUPPORT_EMAIL,
    }) as LegalSection[];

    expect(Array.isArray(sections)).toBe(true);
    expect(sections[0].heading).toBeTruthy();
    expect(sections[0].paragraphs[0]).toContain(SUPPORT_EMAIL);
    expect(JSON.stringify(sections)).not.toContain('{{email}}');
  });

  it('returns terms sections with the email interpolated', () => {
    const sections = i18n.t('legal.terms.sections', {
      returnObjects: true,
      email: SUPPORT_EMAIL,
    }) as LegalSection[];

    expect(Array.isArray(sections)).toBe(true);
    expect(JSON.stringify(sections)).not.toContain('{{email}}');
  });

  it('keeps both locales structurally in sync', () => {
    for (const doc of ['privacy', 'terms'] as const) {
      const enSections = en.legal[doc].sections;
      const elSections = el.legal[doc].sections;

      expect(elSections.length).toBe(enSections.length);
      enSections.forEach((section, index) => {
        expect(elSections[index].paragraphs.length).toBe(
          section.paragraphs.length,
        );
      });
    }
  });
});
