// A lock over the app's own UI.
//
// What it protects: someone picking up an unlocked phone, or reading over a
// shoulder in a queue. That is the actual threat for a budgeting app — not a
// determined attacker, but the ordinary fact that phones get handed around.
//
// What it does NOT protect: the data itself. The Supabase session lives in
// localStorage and anyone who can run devtools on this device can read it
// whether or not this lock is set. Encrypting the cache under the PIN would
// change that, but a four-digit PIN is a 10,000-key space — it would look like
// protection while adding almost none, and would lock the user permanently out
// of their own data if they forgot it. So the lock is honest about being a
// screen lock, the settings copy says so, and "Sign out" is always available
// as the way past it.

const PIN_KEY = 'budgard_app_lock';
const PIN_LENGTH = 4;
// Slow enough to make a brute force over a stolen storage dump tedious,
// fast enough to feel instant on the phone doing the unlocking.
const ITERATIONS = 210_000;
const MAX_ATTEMPTS = 5;

export type AppLockRecord = {
  salt: string;
  hash: string;
  // Unlock with the device's own biometric or passcode instead of the PIN.
  // The PIN stays the fallback: platform authenticators are lost when the
  // device changes, and the user must never be shut out of their own app.
  biometrics: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
};

export const isPinShaped = (pin: string): boolean => {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
};

export const loadLock = (): AppLockRecord | null => {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AppLockRecord;
  } catch {
    // Storage can be unavailable or hold something we did not write. An
    // unreadable lock is no lock — failing open here is deliberate, because
    // the alternative is an app nobody can get into.
    return null;
  }
};

export const isLockEnabled = (): boolean => loadLock() !== null;

export const setPin = async (pin: string): Promise<void> => {
  const salt = randomSalt();
  const hash = await derive(pin, salt);

  save({
    salt,
    hash,
    biometrics: loadLock()?.biometrics ?? false,
    failedAttempts: 0,
    lockedUntil: null,
  });
};

export const clearLock = (): void => {
  try {
    localStorage.removeItem(PIN_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
};

export const setBiometrics = (enabled: boolean): void => {
  const lock = loadLock();
  if (!lock) {
    return;
  }

  save({ ...lock, biometrics: enabled });
};

export type VerifyResult =
  | { ok: true }
  | { ok: false; attemptsLeft: number; lockedUntil: number | null };

export const verifyPin = async (pin: string): Promise<VerifyResult> => {
  const lock = loadLock();
  if (!lock) {
    return { ok: true };
  }
  if (lock.lockedUntil && Date.now() < lock.lockedUntil) {
    return { ok: false, attemptsLeft: 0, lockedUntil: lock.lockedUntil };
  }

  const hash = await derive(pin, lock.salt);
  if (timingSafeEqual(hash, lock.hash)) {
    save({ ...lock, failedAttempts: 0, lockedUntil: null });

    return { ok: true };
  }

  const failedAttempts = lock.failedAttempts + 1;
  const lockedUntil = cooldownFor(failedAttempts);
  save({ ...lock, failedAttempts, lockedUntil });

  return {
    ok: false,
    attemptsLeft: Math.max(MAX_ATTEMPTS - failedAttempts, 0),
    lockedUntil,
  };
};

export const clearFailures = (): void => {
  const lock = loadLock();
  if (!lock) {
    return;
  }

  save({ ...lock, failedAttempts: 0, lockedUntil: null });
};

export { PIN_LENGTH, MAX_ATTEMPTS };

// --- Helpers ---

const save = (record: AppLockRecord): void => {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(record));
  } catch {
    // A lock that cannot be stored is not enforced next load; there is
    // nothing useful to tell the user mid-gesture.
  }
};

// Backs off rather than locking permanently: a child mashing the keypad must
// not brick the app for its owner. Five wrong tries costs a minute.
const cooldownFor = (failedAttempts: number): number | null => {
  if (failedAttempts < MAX_ATTEMPTS) {
    return null;
  }

  const overshoot = failedAttempts - MAX_ATTEMPTS;

  return Date.now() + Math.min(2 ** overshoot, 30) * 60_000;
};

const randomSalt = (): string => {
  const bytes: Uint8Array<ArrayBuffer> = crypto.getRandomValues(
    new Uint8Array(16),
  );

  return toHex(bytes);
};

const derive = async (pin: string, salt: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromHex(salt),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    256,
  );

  return toHex(new Uint8Array(bits));
};

// Compares in constant time with respect to content. The lengths are fixed by
// the digest, so leaking that is not a concern.
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
};

const toHex = (bytes: Uint8Array<ArrayBuffer>): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

// Typed with its real backing buffer: WebCrypto's BufferSource excludes a
// SharedArrayBuffer, which the bare Uint8Array type still admits.
const fromHex = (hex: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array(
    (hex.match(/.{1,2}/g) ?? []).map((pair) => Number.parseInt(pair, 16)),
  );
