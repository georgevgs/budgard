import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');

describe('chart accessibility', () => {
  it('does not hide the keyboard-readable year chart from assistive technology', () => {
    const cashFlowSection = readFileSync(
      path.join(ROOT, 'src/components/analytics/CashFlowSection.tsx'),
      'utf8',
    );
    const chart = readFileSync(
      path.join(ROOT, 'src/components/charts/CartesianChart.tsx'),
      'utf8',
    );

    expect(cashFlowSection).not.toContain(
      '<div className="w-full" aria-hidden="true">',
    );
    expect(chart).toContain('tabIndex={0}');
    expect(chart).toContain('aria-label={props.ariaLabel}');
  });
});
