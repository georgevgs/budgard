// How a session was established, read from the access token's `amr` claim.
//
// Budgard signs people in by an email code or link only, but Supabase's email
// provider still accepts auth.signUp({ email, password }) from the anon key.
// A password session is therefore one the app never created: whoever holds it
// registered a password against an address they may not control. Every
// function that acts on the caller's account refuses it.
//
// This is the same rule as private.is_passwordless_session() in
// supabase/migrations/20260925100000_reject_password_sessions.sql. The
// database enforces it for PostgREST and Storage; this file enforces it for
// the Edge Functions. Loosening either alone re-opens the path the other
// closes, so they change together.

// A denylist, not an allowlist: GoTrue reports an email code as 'otp',
// 'magiclink' or 'email/signup' depending on account state, and missing one
// would lock real users out. The threat is these methods specifically.
export const UNTRUSTED_METHODS = ['password', 'anonymous'];

type AmrEntry = { method: string | null; timestamp: number | null };

// Callers must have validated the token first (getUser() or the gateway's
// verify_jwt); this only reads the payload. Null means the token could not be
// decoded, which every caller treats as a refusal.
export const readAmr = (authHeader: string): AmrEntry[] | null => {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      return null;
    }

    const payloadJson = atob(
      payloadSegment.replace(/-/g, '+').replace(/_/g, '/'),
    );
    const payload = JSON.parse(payloadJson) as { amr?: unknown };
    if (!Array.isArray(payload.amr)) {
      return [];
    }

    return payload.amr.map(toAmrEntry);
  } catch {
    return null;
  }
};

export const isPasswordlessSession = (authHeader: string): boolean => {
  const entries = readAmr(authHeader);
  if (entries === null) {
    return false;
  }

  return !entries.some(isUntrusted);
};

// Irreversible actions also want the sign-in to be recent. Refreshes keep the
// original amr timestamps, so a long-lived session cannot pass this without a
// fresh email code. Fails closed when no timestamp is readable.
export const isRecentlyAuthenticated = (
  authHeader: string,
  windowSeconds: number,
  nowSeconds: number = Date.now() / 1000,
): boolean => {
  const entries = readAmr(authHeader);
  if (entries === null || entries.some(isUntrusted)) {
    return false;
  }

  const timestamps = entries
    .map((entry) => entry.timestamp)
    .filter((timestamp): timestamp is number => timestamp !== null);
  if (timestamps.length === 0) {
    return false;
  }

  return nowSeconds - Math.max(...timestamps) <= windowSeconds;
};

// --- Helpers ---

// GoTrue writes objects ({ method, timestamp }); RFC 8176 allows bare strings.
// Both are read so a format change cannot slip a password session through.
const toAmrEntry = (value: unknown): AmrEntry => {
  if (typeof value === 'string') {
    return { method: value, timestamp: null };
  }
  if (!value || typeof value !== 'object') {
    return { method: null, timestamp: null };
  }

  const record = value as { method?: unknown; timestamp?: unknown };

  return {
    method: readString(record.method),
    timestamp: readNumber(record.timestamp),
  };
};

const readString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  return null;
};

const readNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
};

const isUntrusted = (entry: AmrEntry): boolean => {
  if (entry.method === null) {
    return false;
  }

  return UNTRUSTED_METHODS.includes(entry.method);
};
