import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import BarChart from 'lucide-react/dist/esm/icons/bar-chart';
import Repeat from 'lucide-react/dist/esm/icons/repeat';

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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60"
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
              className="flex flex-1 flex-col items-center py-1.5"
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-2xl transition-all duration-200',
                      isActive ? 'bg-primary/10' : '',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {tab.name}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default NavTabs;
