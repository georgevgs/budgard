import { seed } from './fixtures/screensSeed';
import { test } from './fixtures/test';

// A contact sheet for iOS Dynamic Type. The app sets
// `html { font: -apple-system-body }` on iOS, so every rem grows with the
// user's text size: 17px by default, 23px at XXXL, 28px at AX1. Chromium
// cannot emulate that, so this forces the root font size instead and renders
// the main screens in Greek, the longest strings the app ships.
//
//   npx playwright test e2e/screens-large-text.spec.ts
//
// and open .playwright/screens-large-text/. It asserts nothing on purpose,
// like screens.spec.ts. The output sits outside test-results/ because every
// Playwright run empties that folder. Gitignored output.
const SHOTS = '.playwright/screens-large-text';
const ROOT_FONT_SIZES = [23, 28];
const ROUTES = [
  ['today', '/today'],
  ['activity', '/activity'],
  ['plan', '/plan'],
  ['trends', '/trends'],
] as const;

// What onboarding would have saved for someone who set the app up in Greek.
// The mock backend ships English names, and they are user data, not i18n.
const GREEK_CATEGORY_NAMES: Record<string, string> = {
  'cat-groceries': 'Σούπερ μάρκετ',
  'cat-transport': 'Μεταφορές',
  'cat-salary': 'Μισθός',
};

test.use({
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
  locale: 'el-GR',
});

for (const rootFontSize of ROOT_FONT_SIZES) {
  test.describe(`greek at ${rootFontSize}px`, () => {
    test.beforeEach(async ({ app }) => {
      await app.addInitScript((size) => {
        localStorage.setItem('i18nextLng', 'el');
        // The CSP blocks an injected <style>, an inline style set from script
        // is allowed.
        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.style.setProperty(
            'font-size',
            `${size}px`,
            'important',
          );
        });
      }, rootFontSize);
    });

    for (const [name, path] of ROUTES) {
      test(`screenshot ${name}`, async ({ app, data }) => {
        seedInGreek(data);
        await app.goto(path);
        await app.waitForTimeout(2500);
        await app.screenshot({
          path: `${SHOTS}/el-${rootFontSize}/${name}.png`,
          fullPage: true,
        });
      });
    }

    test('screenshot quick-add', async ({ app, data }) => {
      seedInGreek(data);
      await app.goto('/today');
      await app.waitForTimeout(2000);
      await app
        .getByRole('button', { name: 'Άνοιγμα μενού ενεργειών' })
        .click();
      await app.getByRole('button', { name: 'Προσθήκη Εξόδου' }).click();
      await app.waitForTimeout(900);
      await app.screenshot({
        path: `${SHOTS}/el-${rootFontSize}/quick-add.png`,
      });
    });
  });
}

const seedInGreek = (data: Record<string, Record<string, unknown>[]>) => {
  seed(data);
  data.categories.forEach((category) => {
    const greekName = GREEK_CATEGORY_NAMES[category.id as string];
    if (undefined !== greekName) {
      category.name = greekName;
    }
  });
};
