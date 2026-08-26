import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');

describe('chart accessibility', () => {
  it('does not hide the keyboard-readable year chart from assistive technology', () => {
    const yearOverview = readFileSync(
      path.join(ROOT, 'src/components/analytics/YearOverviewSection.tsx'),
      'utf8',
    );
    const chart = readFileSync(
      path.join(ROOT, 'src/components/charts/CartesianChart.tsx'),
      'utf8',
    );

    expect(yearOverview).not.toContain(
      '<div className="w-full" aria-hidden="true">',
    );
    expect(chart).toContain('tabIndex={0}');
    expect(chart).toContain('aria-label={props.ariaLabel}');
  });
});
