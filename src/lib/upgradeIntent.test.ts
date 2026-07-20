import { describe, it, expect, beforeEach } from 'vitest';
import { consumeUpgradeIntent, saveUpgradeIntent } from '@/lib/upgradeIntent';

const INTENT_KEY = 'budgard-upgrade-intent';

beforeEach(() => {
  localStorage.clear();
});

describe('upgradeIntent', () => {
  it('returns the saved plan exactly once', () => {
    saveUpgradeIntent('monthly');

    expect(consumeUpgradeIntent()).toBe('monthly');
    expect(consumeUpgradeIntent()).toBeNull();
  });

  it('returns null when nothing was saved', () => {
    expect(consumeUpgradeIntent()).toBeNull();
  });

  it('discards an expired intent', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    localStorage.setItem(
      INTENT_KEY,
      JSON.stringify({ plan: 'yearly', savedAt: twoHoursAgo.toISOString() }),
    );

    expect(consumeUpgradeIntent()).toBeNull();
  });

  it('discards malformed payloads instead of throwing', () => {
    localStorage.setItem(INTENT_KEY, 'not-json');

    expect(consumeUpgradeIntent()).toBeNull();

    localStorage.setItem(
      INTENT_KEY,
      JSON.stringify({ plan: 'lifetime', savedAt: new Date().toISOString() }),
    );

    expect(consumeUpgradeIntent()).toBeNull();
  });
});
