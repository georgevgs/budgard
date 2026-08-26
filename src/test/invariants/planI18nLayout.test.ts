import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/locales/en/translation.json';
import el from '@/locales/el/translation.json';

const ROOT = path.resolve(__dirname, '../../..');
const MAX_TITLE_LENGTH = 20;
const MAX_WORD_LENGTH = 10;

const OVERVIEW_TITLES = [
  en.plan.recurring.title,
  en.plan.goals.title,
  en.plan.debts.title,
  en.plan.networth.title,
  el.plan.recurring.title,
  el.plan.goals.title,
  el.plan.debts.title,
  el.plan.networth.title,
];

describe('Plan translation layout', () => {
  it('keeps planning destinations in one compact list', () => {
    const source = readFileSync(
      path.join(ROOT, 'src/components/plan/PlanView.tsx'),
      'utf8',
    );

    expect(source).toContain('surface-card-flush divide-y divide-border/40');
    expect(source).toContain("t('plan.tools.title')");
  });

  it('caps overview copy before a word can overflow a half tile', () => {
    OVERVIEW_TITLES.forEach((title) => {
      const longestWord = Math.max(
        ...title.split(/\s+/u).map((word) => [...word].length),
      );

      expect([...title].length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
      expect(longestWord).toBeLessThanOrEqual(MAX_WORD_LENGTH);
    });
  });

  it('offers setup instead of rendering an empty zero value', () => {
    const source = readFileSync(
      path.join(ROOT, 'src/components/plan/PlanOverviewCard.tsx'),
      'utf8',
    );

    expect(source).toContain('if (!value)');
    expect(source).toContain('{setupLabel}');
  });
});
