<div align="center">

# 💰 Budgard

**A minimal and intuitive expense tracker**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39-3ecf8e.svg)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple.svg)](https://web.dev/progressive-web-apps/)

[Features](#-features) • [Demo](#-demo) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Development](#-development)

</div>

---

## 📱 Overview

Budgard is a modern, progressive web application designed to help you track your expenses effortlessly. Built with React and TypeScript, it offers a clean, intuitive interface with powerful features for managing your personal finances.

### ✨ Features

- **📊 Expense Tracking** - Add, edit, and categorize your expenses with ease
- **🔄 Recurring Expenses** - Set up recurring expenses (weekly, monthly, quarterly, yearly)
- **📈 Analytics Dashboard** - Visualize spending patterns with interactive charts
- **🏷️ Custom Categories** - Create and color-code expense categories
- **📅 Monthly Views** - Track expenses by month with detailed breakdowns
- **🔍 Smart Filtering** - Search and filter expenses by category
- **🌍 Multi-language** - Available in English and Greek (Ελληνικά)
- **🎨 Theme Support** - Light, Dark, and Barbie themes
- **📱 PWA Support** - Install as a mobile or desktop app
- **🔐 Secure Authentication** - Email OTP authentication via Supabase
- **☁️ Cloud Sync** - All data synced securely in the cloud

## 🎯 Demo

**Live App:** [https://budgard.com](https://budgard.com)

Try it out! Sign in with your email and start tracking your expenses instantly.

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first CSS
- **shadcn/ui** - Component library
- **Radix UI** - Headless UI primitives

### Backend & Services
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
- **Vite PWA** - Progressive Web App support

### Data Visualization
- **ApexCharts** - Interactive charts
- **Recharts** - Composable charts

### Developer Experience
- **TypeScript** - Static type checking
- **ESLint** - Code linting
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **date-fns** - Date utilities
- **i18next** - Internationalization

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase account (for backend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/georgevgs/budgard.git
   cd budgard
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Add your Supabase credentials to `.env`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**
   ```bash
   # Initialize Supabase locally (optional)
   npx supabase init
   
   # Link to your Supabase project
   npx supabase link --project-ref your-project-ref
   
   # Push database migrations
   npx supabase db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 💻 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Project Structure

```
budgard/
├── public/              # Static assets
│   ├── locales/        # Translation files
│   └── manifest.json   # PWA manifest
├── src/
│   ├── components/     # React components
│   │   ├── analytics/  # Analytics views
│   │   ├── auth/       # Authentication
│   │   ├── categories/ # Category management
│   │   ├── expenses/   # Expense tracking
│   │   ├── layout/     # Layout components
│   │   ├── recurring/  # Recurring expenses
│   │   └── ui/         # UI primitives (shadcn)
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilities and config
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── types/          # TypeScript types
│   └── App.tsx         # Root component
├── supabase/           # Supabase config
└── package.json
```

### Code Style

This project follows **Airbnb's style guide** with custom conventions:
- ✅ No ternary operators in JSX
- ✅ No `&&` operators for conditional rendering
- ✅ Explicit if/return statements with helper functions
- ✅ Full TypeScript type annotations
- ✅ Helper functions placed below components

See [REFACTORING-COMPLETE.md](./REFACTORING-COMPLETE.md) for more details.

## 🌍 Internationalization

Budgard supports multiple languages via `i18next`:
- 🇬🇧 English
- 🇬🇷 Greek (Ελληνικά)

Translation files are located in `public/locales/{lang}/translation.json`.

To add a new language:
1. Create a new folder in `public/locales/`
2. Add your `translation.json`
3. Update `src/lib/i18n.ts`

## 📱 PWA Features

Budgard is a Progressive Web App that offers:
- 📲 Install to home screen
- ⚡ Offline functionality
- 🔄 Background sync
- 📬 Push notifications (coming soon)

## 🔐 Authentication

Authentication is handled via Supabase with email OTP:
- Magic link email authentication
- Secure session management
- Automatic token refresh

## 🗄️ Database Schema

The app uses Supabase (PostgreSQL) with the following main tables:
- `expenses` - User expenses
- `categories` - Expense categories
- `recurring_expenses` - Recurring expense templates

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**George Vagdas**
- GitHub: [@georgevgs](https://github.com/georgevgs)
- Website: [budgard.com](https://budgard.com)

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Lucide](https://lucide.dev/) for the icons

---

<div align="center">

Made with ❤️ and ☕

If you found this project helpful, please consider giving it a ⭐!

</div>
