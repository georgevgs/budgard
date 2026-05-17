<div align="center">

# Budgard

A personal expense tracker that actually fits in your pocket.

[![Live App](https://img.shields.io/badge/Live-budgard.com-black?style=flat-square)](https://budgard.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#license)

</div>

---

I built Budgard because every expense app I tried was either too complicated or locked behind a subscription. This one is just what I need: log an expense, see where the money went, move on with your day.

It's a PWA so it installs on your phone like a native app, syncs across devices, and works without an App Store.

**[budgard.com](https://budgard.com)** — sign in with your email, no password needed.

## What it does

**Expenses**
- Log expenses with amount, description, date, category, tag, and currency
- Attach receipt photos with drag-and-drop or tap-to-upload (compressed to WebP)
- Save expense templates for quick re-entry of frequent purchases
- Date-grouped feed with sticky headers (Today, Yesterday, or formatted date)
- Filter and search by category, tag, date range, or keyword
- Sort by date or amount, search across all months
- CSV import and export
- Multi-currency support with live exchange rates
- Animated number transitions on totals

**Recurring Expenses**
- Set up recurring expenses (weekly, biweekly, monthly, quarterly, yearly) with start/end dates
- Automatic expense generation via Supabase Edge Function
- Track next occurrence and overdue status
- Toggle active/inactive without deleting
- Preview estimated monthly cost
- Subscription audit — surface monthly + yearly cost of all active subs, flag the largest, toggle off in one tap

**Income**
- Log one-off and recurring income alongside expenses
- Net cash flow card (income − expenses) with savings rate
- 50/30/20 ring (needs / wants / savings) computed live from your data
- Optional savings allocation per income entry
- Stored in a single transactions table with a `type` discriminator

**Analytics**
- Monthly spending snapshot with month-over-month comparison
- Interactive year-over-year area chart with clickable month drill-down
- Category breakdown with sparkline trends and drill-down details
- Budget progress indicator with color-coded alerts
- Proactive insights: weekly category anomalies, daily budget remaining, spending pace, and month-end projection
- Annual export — download a year of transactions or a category summary as CSV

**Budget**
- Set a monthly total budget target
- Per-category budgets with their own 80% / 100% alerts
- Real-time progress tracking with color-coded alerts at 80% and 100%
- Budget reference line on analytics chart

**Savings Goals**
- Create goals with a target amount and optional deadline
- Visual progress bar with on-track / behind status
- Edit, contribute, or delete from a single goal card

**Net Worth**
- Manual accounts (checking, savings, cash, investment, other)
- Snapshot-based balance history per account, with verb-style actions (Add money, Withdraw, Update value)
- Net worth chart with month-over-month delta
- Account groups roll up totals by category
- Investment accounts get an annualized return (XIRR), cost-basis line on the per-account chart, and an allocation donut across holdings
- Recurring expenses can target an investment account so contributions roll into the balance automatically

**Debt Tracker**
- Track debts with balance, APR, and minimum payment
- Snowball or avalanche payoff plan with payoff date estimate
- Log payments as linked expenses; balance auto-updates via DB trigger
- Per-debt progress bar and detail sheet

**Categories and Tags**
- Custom categories with user-chosen colors and emoji icons
- Categories can be tagged as Need, Want, or Savings to feed the 50/30/20 ring
- Tags for finer-grained expense grouping
- Filter by category or tag in the expense list

**Notifications**
- Bill reminders for recurring expenses due tomorrow
- Debt-payment reminders the day before they're due
- Budget warning when monthly or per-category spend crosses 80%
- Budget exceeded when monthly or per-category spend crosses 100%
- Configurable daily reminder at the hour you choose
- In-app daily and weekly recap cards that summarize recent activity
- Per-type toggles in settings; works across mobile and desktop

**Customization**
- Three themes: dark, light, and Barbie
- Seven accent colors: Sunset, Ocean, Lavender, Mint, Coral, Gold, Slate
- English and Greek (auto-detected from browser)
- Default currency setting

**Other**
- Guided onboarding for new users
- Offline support with sync on reconnect
- PWA update detection with in-app prompt
- Installable on iOS, Android, and desktop
- Account deletion from settings

## Tech

React 19 + TypeScript + Vite on the frontend. Supabase handles auth (email OTP), the Postgres database, file storage for receipts, and Edge Functions for recurring expense generation and push notifications. Deployed on Netlify.

UI components from shadcn/ui, charts from Recharts, forms from react-hook-form + Zod. State lives in React Context with optimistic updates (custom rollback pattern) so the UI never feels slow. Cloudflare Turnstile protects the auth flow. Errors are monitored with Sentry. Push notifications use the Web Push API with VAPID authentication.

### Key architecture

- **State**: Context API — `AuthContext` for sessions; `DataContext` is split into `useData` (full snapshot), `useDataConfig` (slow-changing scalars), and `useDataActions` (stable setters) so consumers don't re-render on unrelated mutations
- **Data**: All Supabase calls go through `services/dataService.ts`; transactions load in two stages (last 12 months first, full history streams in)
- **Mutations**: Optimistic updates with rollback composed from `hooks/dataOps/*` under `useDataOperations`
- **Validation**: Zod schemas in `lib/validations.ts`, react-hook-form for forms
- **Routing**: Lazy-loaded routes with `PrivateRoute` / `PublicRoute` guards
- **Path alias**: `@/*` maps to `./src/*`
- **i18n**: i18next with browser language detection
- **Offline**: Queued mutations with automatic sync on reconnect

## Scripts

```bash
npm run dev          # dev server
npm run build        # TypeScript compile + Vite production build
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier format
npm run typecheck    # TypeScript check without emit
npm test             # run all tests (Vitest)
npm run test:coverage # with coverage report
npm run test:watch   # watch mode
```

## License

This project is **proprietary software**. The source code is available for reference and transparency, but copying, modifying, distributing, or using this software — in whole or in part — is not permitted without explicit authorization.

See [LICENSE](LICENSE) for full terms.

---

<div align="center">

Built by [George Vagdas](https://github.com/georgevgs)

</div>
