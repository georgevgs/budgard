// Unlocking with the device's own biometric or passcode, via a WebAuthn
// platform authenticator.
//
// This is a presence check, not a key: the assertion proves the person holding
// the phone just satisfied Face ID or the device passcode. It does not decrypt
// anything, because there is nothing encrypted — see lib/appLock.ts for why
// the lock is deliberately a screen lock rather than an encryption scheme.
// Treating it as a convenience over the PIN, rather than as stronger security,
// is what keeps the two honest about being the same thing.

const CREDENTIAL_KEY = 'budgard_unlock_credential';

export const isDeviceUnlockSupported = async (): Promise<boolean> => {
  if (typeof PublicKeyCredential !== 'function') {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

export const hasEnrolledCredential = (): boolean => {
  try {
    return localStorage.getItem(CREDENTIAL_KEY) !== null;
  } catch {
    return false;
  }
};

// Registers a platform credential for this device. The challenge is local
// because nothing is verified server-side — a server that does not check the
// signature gains nothing from a server-issued challenge.
export const enrolDeviceUnlock = async (userId: string): Promise<boolean> => {
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: 'Budgard' },
        user: {
          id: new TextEncoder().encode(userId),
          name: 'Budgard',
          displayName: 'Budgard',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return false;
    }

    localStorage.setItem(CREDENTIAL_KEY, toBase64Url(credential.rawId));

    return true;
  } catch {
    // The user dismissed the prompt, or the device refused. Either way the
    // caller falls back to the PIN.
    return false;
  }
};

export const forgetDeviceUnlock = (): void => {
  try {
    localStorage.removeItem(CREDENTIAL_KEY);
  } catch {
    // Nothing to forget.
  }
};

export const requestDeviceUnlock = async (): Promise<boolean> => {
  const stored = readCredentialId();
  if (!stored) {
    return false;
  }

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ type: 'public-key', id: stored }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });

    return assertion !== null;
  } catch {
    return false;
  }
};

// --- Helpers ---

// Typed with its real backing buffer: WebAuthn's BufferSource excludes a
// SharedArrayBuffer, which the bare Uint8Array type still admits.
const randomBytes = (length: number): Uint8Array<ArrayBuffer> =>
  crypto.getRandomValues(new Uint8Array(length));

const readCredentialId = (): Uint8Array<ArrayBuffer> | null => {
  try {
    const stored = localStorage.getItem(CREDENTIAL_KEY);
    if (!stored) {
      return null;
    }

    return fromBase64Url(stored);
  } catch {
    return null;
  }
};

const toBase64Url = (buffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};
