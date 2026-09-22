import { beforeEach, describe, expect, it } from 'vitest';
import {
  readWeeklyRecapDismissal,
  writeWeeklyRecapDismissal,
} from '@/pages/today/hooks/useWeeklyRecap';

describe('weekly recap dismissal storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps each account dismissal independent', () => {
    writeWeeklyRecapDismissal('user-1', '2026-09-20');

    expect(readWeeklyRecapDismissal('user-1')).toBe('2026-09-20');
    expect(readWeeklyRecapDismissal('user-2')).toBe('');
  });
});
