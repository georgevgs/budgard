import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import BrandMark from '@/components/common/BrandMark';
import { Button } from '@/components/ui/button';
import ProfileMenu from '@/components/layout/ProfileMenu';

// Routes outside the four bottom tabs. They get a back button in the left
// slot — the dock still marks which tab owns them (see NavTabs), but a
// child route is somewhere you came *from* somewhere, so the way out is
// explicit rather than a second guess at which tab to tap.
const SECONDARY_ROUTES = [
  '/expenses',
  '/income',
  '/recurring',
  '/analytics',
  '/goals',
  '/networth',
  '/debts',
  '/settings',
];

const Header = () => {
  const { session } = useAuth();
  const { t } = useTranslation();
  const { pathname } = useLocation();

  // Initialize theme on mount (applies to document + meta theme-color)
  useTheme();

  if (!session) {
    return null;
  }

  // Transaction detail is a per-id route, so it cannot be listed literally.
  const isSecondaryRoute =
    SECONDARY_ROUTES.includes(pathname) || pathname.startsWith('/t/');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/78 backdrop-blur-2xl pt-safe-t">
      <div className="container grid grid-cols-3 items-center h-(--header-height) px-4 pt-1">
        <div className="justify-self-start">
          {renderLeftSlot(isSecondaryRoute)}
        </div>
        <Link
          to="/today"
          viewTransition
          aria-label={t('navigation.goHome')}
          className="justify-self-center flex items-center gap-2 rounded-lg px-2 py-1 -mx-2 -my-1 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark className="h-7 w-7" />
          <span className="font-display text-lg font-semibold tracking-[-0.025em]">
            Budgard
          </span>
        </Link>
        <div className="justify-self-end">
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;

// ─── Helper render functions ──────────────────────────────────────────────────

const renderLeftSlot = (isSecondaryRoute: boolean) => {
  if (isSecondaryRoute) {
    return <BackButton />;
  }

  return null;
};

const BackButton = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = () => {
    // React Router stamps an index into history state; 0 means this entry
    // was a direct load (deep link), where "back" would leave the app.
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx;
    if (historyIndex && historyIndex > 0) {
      navigate(-1);

      return;
    }
    navigate('/today', { viewTransition: true });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-11 w-11 rounded-full p-0 bg-muted text-foreground hover:bg-muted/80 ring-1 ring-border/40"
      onClick={handleBack}
      aria-label={t('common.back')}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
};
