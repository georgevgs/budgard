// Single source of truth for which browser origins may call the Edge
// Functions. Production plus the local Vite servers, so running the app on
// localhost does not need a dev proxy or a temporary wildcard that could ship.
//
// Reflecting an allowlisted Origin back is safe: browsers set that header
// themselves and a page cannot forge it. Anything unrecognised gets the
// canonical production origin instead, which the caller's browser then
// rejects — the same outcome as the previous hardcoded header.

const PRODUCTION_ORIGIN = 'https://budgard.com';

const ALLOWED_ORIGINS = [
  PRODUCTION_ORIGIN,
  // vite dev
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // vite preview
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

export const corsHeadersFor = (req: Request): Record<string, string> => {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(req.headers.get('Origin')),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    // The body is the same for every origin but this header is not, so any
    // cache in between must key on Origin. Without it a response minted for
    // localhost could be replayed to budgard.com and fail CORS there.
    Vary: 'Origin',
  };
};

// Builds a JSON responder already bound to one request's CORS headers, so
// call sites stay `jsonResponse(body, status)` and no response path can
// forget the headers.
export const jsonResponder = (
  req: Request,
  extraHeaders: Record<string, string> = {},
) => {
  const headers = {
    ...corsHeadersFor(req),
    ...extraHeaders,
    'Content-Type': 'application/json',
  };

  return (body: Record<string, unknown>, status: number): Response => {
    return new Response(JSON.stringify(body), { status, headers });
  };
};

// --- Helpers ---

const resolveOrigin = (origin: string | null): string => {
  if (origin === null) {
    return PRODUCTION_ORIGIN;
  }

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return PRODUCTION_ORIGIN;
  }

  return origin;
};
