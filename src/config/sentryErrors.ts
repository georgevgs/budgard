// Supabase rejects with a plain object ({ code, message, details, hint }), not
// an Error. Sentry reports that as "Object captured as exception with keys:
// code, details, hint, message" — no message in the title — and groups every
// database failure from the mutation runner into one issue, because they all
// share its stack. A duplicate tag name, an RLS refusal and a plan cap then
// look identical.
//
// This turns such an object into an Error titled with its code and message and
// fingerprints it by the same, so each kind of refusal is its own issue.
// `details` stays behind: for a unique violation it carries the row's values
// (the duplicate name itself), which the title does not need.

type CaptureArgs = [exception: unknown, hint?: unknown];

type DatabaseErrorLike = {
  code: string;
  message: string;
  hint?: unknown;
};

type CaptureContextLike = {
  tags?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
};

export const normalizeCaptureArgs = <T extends CaptureArgs>(args: T): T => {
  const [exception, hint] = args;
  if (!isDatabaseError(exception) || !isPlainContext(hint)) {
    return args;
  }

  const reportable = new Error(`${exception.code} ${exception.message}`);
  reportable.name = 'PostgrestError';
  const context: CaptureContextLike = hint ?? {};

  return [
    reportable,
    {
      ...context,
      tags: { ...context.tags, db_code: exception.code },
      extra: { ...context.extra, db_hint: exception.hint ?? null },
      fingerprint: context.fingerprint ?? [
        '{{ default }}',
        exception.code,
        exception.message,
      ],
    },
  ] as unknown as T;
};

const isDatabaseError = (value: unknown): value is DatabaseErrorLike => {
  if (!value || typeof value !== 'object' || value instanceof Error) {
    return false;
  }

  const candidate = value as { code?: unknown; message?: unknown };

  return (
    typeof candidate.code === 'string' && typeof candidate.message === 'string'
  );
};

// Only an object literal is merged. A Scope instance or a callback is passed
// through untouched rather than flattened into something Sentry cannot read.
const isPlainContext = (
  hint: unknown,
): hint is CaptureContextLike | undefined => {
  if (hint === undefined) {
    return true;
  }
  if (!hint || typeof hint !== 'object') {
    return false;
  }

  return Object.getPrototypeOf(hint) === Object.prototype;
};
