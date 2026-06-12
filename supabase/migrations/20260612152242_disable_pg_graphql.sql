-- Security hardening (June 2026 audit): the app talks to PostgREST only —
-- nothing uses the /graphql/v1 endpoint. Disabling pg_graphql removes an
-- unused query surface and clears 12 "table visible in GraphQL schema"
-- security advisors. Reversible with CREATE EXTENSION pg_graphql.
DROP EXTENSION IF EXISTS pg_graphql;
