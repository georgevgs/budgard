// Decides whether a failed mutation should be SAVED LOCALLY and retried later
// (a connectivity / server-availability problem) versus surfaced to the user as
// a real error (a permanent failure like validation or a denied RLS policy).
//
// Returning `true` for a permanent error would loop forever; returning `false`
// for a transient one would lose the user's change. When the signal is
// ambiguous we err on the side of `false` (surface it) so we never silently
// queue garbage — the common offline / unreachable / timeout cases are matched
// explicitly below.

type ExtractedError = {
  name: string;
  message: string;
  status?: number;
  code?: string;
};

const NETWORK_MESSAGE_RE =
  /failed to fetch|load failed|networkerror|network error|fetch failed|signal timed out|operation was aborted|timed out|timeout/i;

export const isOfflineError = (error: unknown): boolean => {
  // The clearest signal: the browser already knows it has no connection.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  const { name, message, status, code } = extractError(error);

  // Aborted by our request timeout (server accepted but never responded), or a
  // caller-initiated abort that raced a dropped connection.
  if (name === 'AbortError' || name === 'TimeoutError') {
    return true;
  }

  // Fetch-level failures (unreachable host, DNS, refused, CORS-on-failure) and
  // timeout messages. supabase-js wraps these into its error `message`.
  if (NETWORK_MESSAGE_RE.test(message)) {
    return true;
  }

  // HTTP status, when available: no response (0) or a server-side 5xx is
  // transient → queue & retry. A 4xx is the caller's fault → surface it.
  if (typeof status === 'number') {
    if (status === 0 || status >= 500) {
      return true;
    }
    if (status >= 400) {
      return false;
    }
  }

  // Some transports expose the status only as a stringified `code`.
  if (code && /^5\d\d$/.test(code)) {
    return true;
  }

  return false;
};

// --- Helpers ---

const extractError = (error: unknown): ExtractedError => {
  if (typeof error === 'string') {
    return { name: '', message: error };
  }

  if (typeof error !== 'object' || error === null) {
    return { name: '', message: '' };
  }

  const e = error as Record<string, unknown>;

  return {
    name: typeof e.name === 'string' ? e.name : '',
    message: typeof e.message === 'string' ? e.message : '',
    status: typeof e.status === 'number' ? e.status : undefined,
    code: typeof e.code === 'string' ? e.code : undefined,
  };
};
