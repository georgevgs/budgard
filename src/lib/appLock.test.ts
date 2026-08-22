import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import {
  clearLock,
  isLockEnabled,
  loadLock,
  setBiometrics,
  setPin,
  verifyPin,
  MAX_ATTEMPTS,
} from '@/lib/appLock';

describe('appLock', () => {
  beforeEach(() => {
    localStorage.clear();
    clearLock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is off until a pin is set', async () => {
    expect(isLockEnabled()).toBe(false);

    await setPin('1234');

    expect(isLockEnabled()).toBe(true);
  });

  // The stored record must never be able to give the pin back.
  it('never stores the pin itself', async () => {
    await setPin('1234');

    expect(JSON.stringify(loadLock())).not.toContain('1234');
    expect(loadLock()?.hash).toHaveLength(64);
  });

  // Two people choosing 1234 must not produce the same stored hash.
  it('salts each lock separately', async () => {
    await setPin('1234');
    const first = loadLock();
    clearLock();
    await setPin('1234');
    const second = loadLock();

    expect(first?.salt).not.toBe(second?.salt);
    expect(first?.hash).not.toBe(second?.hash);
  });

  it('accepts the right pin and rejects a wrong one', async () => {
    await setPin('1234');

    expect((await verifyPin('1234')).ok).toBe(true);
    expect((await verifyPin('9999')).ok).toBe(false);
  });

  it('counts down the attempts left', async () => {
    await setPin('1234');

    const first = await verifyPin('0000');
    expect(first).toEqual({
      ok: false,
      attemptsLeft: MAX_ATTEMPTS - 1,
      lockedUntil: null,
    });
  });

  it('forgets the failures once the right pin arrives', async () => {
    await setPin('1234');
    await verifyPin('0000');
    await verifyPin('1234');

    expect(loadLock()?.failedAttempts).toBe(0);
  });

  // A child mashing the keypad must not brick the app for its owner, so the
  // lockout backs off rather than being permanent.
  it('cools down after repeated wrong pins, and lets go again', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T10:00:00Z'));
    await setPin('1234');

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      await verifyPin('0000');
    }

    const blocked = await verifyPin('1234');
    expect(blocked.ok).toBe(false);

    vi.setSystemTime(new Date('2026-08-21T10:31:00Z'));
    expect((await verifyPin('1234')).ok).toBe(true);
  });

  it('keeps the biometric preference across a pin change', async () => {
    await setPin('1234');
    setBiometrics(true);
    await setPin('5678');

    expect(loadLock()?.biometrics).toBe(true);
  });

  // An unreadable record is no lock at all: failing open is deliberate,
  // because the alternative is an app nobody can get into.
  it('fails open on a corrupted record', async () => {
    await setPin('1234');
    localStorage.setItem('budgard_app_lock', 'not json');

    expect(isLockEnabled()).toBe(false);
  });
});
