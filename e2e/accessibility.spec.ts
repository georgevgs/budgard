import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';

const AUTHENTICATED_ROUTES = [
  '/today',
  '/activity',
  '/plan',
  '/trends',
  '/settings',
] as const;

test('landing page has no structural accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await expectAccessible(page);
});

for (const route of AUTHENTICATED_ROUTES) {
  test(`${route} has no structural accessibility violations`, async ({
    app,
  }) => {
    await app.goto(route);
    await app.waitForLoadState('domcontentloaded');

    await expectAccessible(app);
  });
}

test('quick-add dialog has no structural accessibility violations', async ({
  app,
}) => {
  await app.goto('/today');
  await app.getByRole('button', { name: /open actions menu/i }).click();
  await app.getByRole('button', { name: /add expense/i }).click();
  await expect(app.getByRole('dialog')).toBeVisible();

  await expectAccessible(app);
});

// --- Helpers ---

const expectAccessible = async (page: Page): Promise<void> => {
  // Let the provider replace its boot skeletons before scanning. Colour
  // contrast stays outside this gate because the brand slab's documented
  // 2.3:1 floor is an explicit product exception pinned in tokens.test.ts.
  // Axe still covers names, labels, landmarks, ARIA and keyboard semantics.
  await page.waitForTimeout(500);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .disableRules('color-contrast')
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
};

type AxeViolation = {
  id: string;
  impact: string | null;
  nodes: Array<{ target: unknown }>;
};

const formatViolations = (violations: AxeViolation[]): string => {
  const lines = violations.map((violation) => {
    const targets = violation.nodes
      .map((node) => String(node.target))
      .join(', ');

    return `${violation.id} (${violation.impact ?? 'unknown'}): ${targets}`;
  });

  return lines.join('\n');
};
