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

const resolvePageTitle = (pathname: string, t: TFunc): string => {
  if (pathname === '/today') return t('navigation.today');
  if (pathname === '/activity') return t('navigation.activity');
  if (pathname === '/plan') return t('navigation.plan');
  if (pathname === '/trends') return t('navigation.trends');
  if (pathname === '/expenses') return t('navigation.expenses');
  if (pathname === '/income') return t('navigation.income');
  if (pathname === '/recurring') return t('navigation.recurring');
  if (pathname === '/analytics') return t('navigation.analytics');
  if (pathname === '/goals') return t('navigation.goals');
  if (pathname === '/networth') return t('navigation.networth');
  if (pathname === '/debts') return t('navigation.debts');
  if (pathname === '/settings') return t('navigation.settings');
  if (pathname === '/privacy') return t('legal.privacy.title');
  if (pathname === '/terms') return t('legal.terms.title');
  if (pathname === '/contact') return t('legal.contact.title');

  return 'Budgard';
};

const buildDocumentTitle = (pageTitle: string): string => {
  if (pageTitle === 'Budgard') return pageTitle;

  return `${pageTitle} · Budgard`;
};
