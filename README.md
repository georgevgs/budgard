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
- Custom categories with user-chosen colors and emoji icons
- Tags for finer-grained expense grouping
- Filter by category or tag in the expense list

**Notifications**
- Push notifications for recurring expenses due tomorrow
- Inactivity nudge when no expenses are logged for 3 days
- Configurable daily reminder to log expenses
- Works across mobile and desktop

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

- **State**: Context API — `AuthContext` for sessions, `DataContext` for all user data
- **Data**: All Supabase calls go through `services/dataService.ts`
- **Mutations**: Optimistic updates with rollback in `hooks/useDataOperations.ts`
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
