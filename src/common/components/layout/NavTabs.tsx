import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/constants/utils';
import { haptics } from '@/constants/haptics';
import { useNavAutoHide } from '@/common/hooks/useNavAutoHide';
import { getOwningTab } from '@/constants/routes';
import House from 'lucide-react/dist/esm/icons/house';
import List from 'lucide-react/dist/esm/icons/list';
import CalendarRange from 'lucide-react/dist/esm/icons/calendar-range';
import ChartSpline from 'lucide-react/dist/esm/icons/chart-spline';

type Tab = {
  name: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

export const NavTabs = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const owningTab = getOwningTab(pathname);

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
        {renderIndicator(
          tabs.findIndex((tab) => tab.path === owningTab),
          tabs.length,
        )}
        {tabs.map((tab) => renderTab(tab, tab.path === owningTab))}
      </div>
    </nav>
  );
};

const renderTab = (tab: Tab, isActive: boolean) => {
  const Icon = tab.icon;

  return (
    <Link
      key={tab.path}
      to={tab.path}
      viewTransition
      onClick={() => haptics.selection()}
      aria-current={currentPage(isActive)}
      className={cn(
        'relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        { active: isActive },
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0 transition-colors',
          getTabToneClassName(isActive),
        )}
      />
      <span
        className={cn(
          'w-full whitespace-normal break-normal px-0.5 text-center text-[11px] font-semibold leading-tight transition-colors',
          getTabToneClassName(isActive),
        )}
      >
        {tab.name}
      </span>
    </Link>
  );
};

// Settings is the only screen with no owning tab — it hangs off the profile
// menu, not off a section of the app, so the dock stays unlit there.
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

const currentPage = (isActive: boolean): 'page' | undefined => {
  if (isActive) {
    return 'page';
  }

  return undefined;
};

const getTabToneClassName = (isActive: boolean): string => {
  if (isActive) {
    return 'text-primary-ink';
  }

  return 'text-muted-foreground';
};
