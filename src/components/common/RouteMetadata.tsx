import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

// Keeps browser history, assistive technology and the visible route in sync.
const RouteMetadata = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const pageTitle = resolvePageTitle(pathname, t);

  useEffect(() => {
    document.title = buildDocumentTitle(pageTitle);
  }, [pageTitle]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <span className="sr-only" role="status" aria-live="polite">
      {pageTitle}
    </span>
  );
};

export default RouteMetadata;

// --- Helpers ---

type TFunc = (key: string) => string;

const PAGE_TITLE_KEYS: Record<string, string> = {
  '/today': 'navigation.today',
  '/activity': 'navigation.activity',
  '/plan': 'navigation.plan',
  '/trends': 'navigation.trends',
  '/expenses': 'navigation.expenses',
  '/income': 'navigation.income',
  '/recurring': 'navigation.recurring',
  '/analytics': 'navigation.analytics',
  '/goals': 'navigation.goals',
  '/networth': 'navigation.networth',
  '/debts': 'navigation.debts',
  '/settings': 'navigation.settings',
  '/settings/account': 'settings.groups.account.title',
  '/settings/preferences': 'settings.groups.preferences.title',
  '/settings/notifications': 'settings.groups.notifications.title',
  '/settings/data': 'settings.groups.data.title',
  '/privacy': 'legal.privacy.title',
  '/terms': 'legal.terms.title',
  '/contact': 'legal.contact.title',
};

const resolvePageTitle = (pathname: string, t: TFunc): string => {
  const titleKey = PAGE_TITLE_KEYS[pathname];
  if (!titleKey) {
    return 'Budgard';
  }

  return t(titleKey);
};

const buildDocumentTitle = (pageTitle: string): string => {
  if (pageTitle === 'Budgard') {
    return pageTitle;
  }

  return `${pageTitle} · Budgard`;
};
