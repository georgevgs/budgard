<div align="center">

# Budgard

A personal expense tracker that actually fits in your pocket.

[![Live App](https://img.shields.io/badge/Live-budgard.com-black?style=flat-square)](https://budgard.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square)](https://reactjs.org/)

</div>

---

I built Budgard because every expense app I tried was either too complicated or locked behind a subscription. This one is just what I need: log an expense, see where the money went, move on with your day.

It's a PWA so it installs on your phone like a native app, syncs across devices, and works without an App Store.

**[budgard.com](https://budgard.com)** — sign in with your email, no password needed.

## What it does

- Log expenses with a category, amount, date, and optional receipt photo
- Set up recurring expenses (rent, subscriptions, etc.) so you're not re-entering them every month
- Tag expenses for finer-grained grouping beyond categories
- See a monthly breakdown and spending charts in the analytics view
- Set a monthly budget and track how you're doing against it
- Filter by category, tag, or date range when you're hunting for something specific
- English and Greek (Ελληνικά) — auto-detected from your browser

## Tech

React 19 + TypeScript + Vite on the frontend. Supabase handles auth (email OTP magic links), the Postgres database, file storage for receipts, and an Edge Function for recurring expense generation. Deployed on Netlify.

UI components are from shadcn/ui, charts from ApexCharts, forms from react-hook-form + Zod. State lives in React Context with optimistic updates so the UI never feels slow. Cloudflare Turnstile protects the auth flow from bots. Errors are monitored with Sentry (with sourcemap upload on every production deploy).

## Running locally

You'll need Node.js 18+ and a Supabase project.

```bash
git clone https://github.com/georgevgs/budgard.git
cd budgard
npm install
cp .env.example .env
```

Add your credentials to `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key  # optional, skips bot check if absent

# Sentry (optional — only needed for production error monitoring)
VITE_SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
SENTRY_AUTH_TOKEN=your_sentry_auth_token         # enables sourcemap upload on build
```

Push the database migrations and start the dev server:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
npm run dev
```

App is at `http://localhost:5173`.

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

## Contributing

PRs are welcome. For bigger changes, open an issue first so we can talk through the approach.

---

<div align="center">

Built by [George Vagdas](https://github.com/georgevgs)

</div>
