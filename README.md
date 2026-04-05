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

**Expenses**
- Log expenses with amount, description, date, category, tag, currency, and optional receipt photo
- Date-grouped feed with sticky headers (Today, Yesterday, or formatted date)
- Filter and search by category, tag, date range, or keyword
- Sort by date or amount, search across all months
- CSV import and export
- Animated number transitions on totals for a polished feel

**Recurring Expenses**
- Set up recurring expenses (weekly, biweekly, monthly, quarterly, yearly) with start/end dates
- Automatic expense generation via Supabase Edge Function
- Track next occurrence and overdue status
- Toggle active/inactive without deleting

**Analytics**
- Monthly spending snapshot with month-over-month comparison
- Interactive year-over-year area chart with clickable month drill-down
- Category breakdown with sparkline trends and drill-down details
- Budget progress indicator with color-coded alerts
- Proactive spending insights: projections, peak spending days, category comparisons, budget streaks, weekend vs weekday patterns, spending volatility
- Shareable monthly report card — export as PNG or share via native share sheet

**Budget**
- Set a monthly budget target
- Real-time progress tracking with color-coded alerts at 75%, 90%, and 100%
- Budget reference line on analytics chart

**Categories and Tags**
- Custom categories with user-chosen colors
- Tags for finer-grained expense grouping
- Filter by category or tag in the expense list

**Receipts**
- Photo capture with drag-and-drop or tap-to-upload
- Client-side compression to WebP (1MB target, 10MB max input)
- Inline preview and viewer

**Other**
- English and Greek (auto-detected from browser)
- Dark, light, and Barbie themes
- Guided onboarding for new users
- Offline support with sync on reconnect
- Installable as a PWA on iOS, Android, and desktop

## Tech

React 19 + TypeScript + Vite on the frontend. Supabase handles auth (email OTP), the Postgres database, file storage for receipts, and an Edge Function for recurring expense generation. Deployed on Netlify.

UI components from shadcn/ui, charts from Recharts, forms from react-hook-form + Zod. State lives in React Context with optimistic updates (custom rollback pattern) so the UI never feels slow. Cloudflare Turnstile protects the auth flow. Errors are monitored with Sentry.

### Key architecture

- **State**: Context API — `AuthContext` for sessions, `DataContext` for all user data
- **Data**: All Supabase calls go through `services/dataService.ts`
- **Mutations**: Optimistic updates with rollback in `hooks/useDataOperations.ts`
- **Validation**: Zod schemas in `lib/validations.ts`, react-hook-form for forms
- **Routing**: Lazy-loaded routes with `PrivateRoute` / `PublicRoute` guards
- **Path alias**: `@/*` maps to `./src/*`
- **i18n**: i18next with browser language detection

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

## Scripts

```bash
npm run dev          # dev server
npm run build        # TypeScript compile + Vite production build
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier format
npm run typecheck    # TypeScript check without emit
npm test             # Run tests (Vitest)
```

## Testing

Tests use Vitest + React Testing Library with jsdom. Coverage targets `src/lib/`, `src/hooks/`, and `src/services/`.

```bash
npm test                    # run all tests
npm run test:coverage       # with coverage report
npm run test:watch          # watch mode
```

## Contributing

PRs are welcome. For bigger changes, open an issue first so we can talk through the approach.

---

<div align="center">

Built by [George Vagdas](https://github.com/georgevgs)

</div>
