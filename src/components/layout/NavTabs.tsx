import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useNavAutoHide } from '@/hooks/useNavAutoHide';
import House from 'lucide-react/dist/esm/icons/house';
import List from 'lucide-react/dist/esm/icons/list';
import CalendarRange from 'lucide-react/dist/esm/icons/calendar-range';
import ChartSpline from 'lucide-react/dist/esm/icons/chart-spline';

type Tab = {
  name: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

const NavTabs = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  useNavAutoHide(pathname);

  const tabs: Tab[] = [
    {
      name: t('navigation.today'),
      path: '/today',
      icon: House,
    },
    {
      name: t('navigation.activity'),
      path: '/activity',
      icon: List,
    },
    {
      name: t('navigation.plan'),
      path: '/plan',
      icon: CalendarRange,
    },
    {
      name: t('navigation.trends'),
      path: '/trends',
      icon: ChartSpline,
    },
  ];

  return (
    <nav
      className="nav-dock pointer-events-none fixed inset-x-(--dock-edge) bottom-(--dock-bottom) z-50"
      aria-label={t('navigation.ariaLabel')}
    >
      <div className="glass-capsule pointer-events-auto relative flex h-(--dock-height) items-stretch p-1">
        {renderIndicator(getActiveIndex(pathname, tabs), tabs.length)}
        {tabs.map((tab) => renderTab(tab))}
      </div>
    </nav>
  );
};

export default NavTabs;

// --- Helpers ---

const renderTab = (tab: Tab) => {
  const Icon = tab.icon;

  return (
    <NavLink
      key={tab.path}
      to={tab.path}
      viewTransition
      onClick={() => haptics.selection()}
      className="relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'h-5 w-5 shrink-0 transition-colors',
              getTabToneClassName(isActive),
            )}
          />
          <span
            className={cn(
              'w-full truncate px-1 text-center text-[10px] font-semibold leading-none transition-colors',
              getTabToneClassName(isActive),
            )}
          >
            {tab.name}
          </span>
        </>
      )}
    </NavLink>
  );
};

// Nothing is highlighted on routes that live outside the tab set —
// Goals, Net worth, Debts and Settings all reach the nav but own no tab.
const renderIndicator = (activeIndex: number, tabCount: number) => {
  if (activeIndex < 0) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="nav-indicator absolute inset-y-1 left-1"
      style={{
        width: `calc((100% - 0.5rem) / ${tabCount})`,
        transform: `translateX(${activeIndex * 100}%)`,
      }}
    >
      {/* Remounting on index change replays the squish; the travel itself
          lives on the parent so it is never interrupted. */}
      <span key={activeIndex} className="nav-indicator-skin" />
    </span>
  );
};

const getActiveIndex = (pathname: string, tabs: Tab[]): number =>
  tabs.findIndex((tab) => {
    if (pathname === tab.path) {
      return true;
    }

    return pathname.startsWith(`${tab.path}/`);
  });

const getTabToneClassName = (isActive: boolean): string => {
  if (isActive) {
    return 'text-primary';
  }

  return 'text-muted-foreground';
};
