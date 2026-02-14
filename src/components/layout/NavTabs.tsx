import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { FileText, BarChart, Repeat } from 'lucide-react';

const NavTabs = () => {
  const { t } = useTranslation();

  const tabs = [
    {
      name: t('navigation.expenses'),
      path: '/expenses',
      icon: FileText,
    },
    {
      name: t('navigation.recurring'),
      path: '/recurring',
      icon: Repeat,
    },
    {
      name: t('navigation.analytics'),
      path: '/analytics',
      icon: BarChart,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
      aria-label={t('navigation.ariaLabel')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default NavTabs;
