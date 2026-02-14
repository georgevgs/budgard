import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';
import { LogOut, Moon, Sun, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

type Theme = 'light' | 'dark' | 'barbie';

const THEME_STORAGE_KEY = 'theme';
const DEFAULT_THEME: Theme = 'light';

const getInitialTheme = (): Theme => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (
    savedTheme === 'light' ||
    savedTheme === 'dark' ||
    savedTheme === 'barbie'
  ) {
    return savedTheme;
  }

  return DEFAULT_THEME;
};

const applyThemeToDocument = (theme: Theme): void => {
  const root = window.document.documentElement;
  root.setAttribute('data-theme', theme);

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update meta theme-color to match the current theme's background
  requestAnimationFrame(() => {
    const bgHsl = getComputedStyle(root).getPropertyValue('--background').trim();
    if (bgHsl) {
      const themeColorMeta = document.querySelector(
        'meta[name="theme-color"]:not([media])',
      );
      // Remove media-specific tags and use a single dynamic one
      document
        .querySelectorAll('meta[name="theme-color"][media]')
        .forEach((el) => el.remove());
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', `hsl(${bgHsl})`);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = `hsl(${bgHsl})`;
        document.head.appendChild(meta);
      }
    }
  });
};

const Header = () => {
  const { session } = useAuth();
  const { t } = useTranslation();

  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyThemeToDocument(theme);
  }, [theme]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const renderThemeIcon = () => {
    if (theme === 'light') {
      return <Sun className="h-4 w-4" />;
    }

    if (theme === 'dark') {
      return <Moon className="h-4 w-4" />;
    }

    return <Sparkles className="h-4 w-4 text-pink-500" />;
  };

  if (!session) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background pt-safe-t">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img
            src="/icon-512x512.png"
            alt={t('common.logoAlt')}
            className="h-7 w-7"
            style={{ objectFit: 'contain' }}
          />
          <span className="text-lg font-semibold tracking-tight">Budgard</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                {renderThemeIcon()}
                <span className="sr-only">{t('common.toggleTheme')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                <Sun className="h-4 w-4 mr-2" />
                {t('theme.light')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                <Moon className="h-4 w-4 mr-2" />
                {t('theme.dark')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleThemeChange('barbie')}
                className="text-pink-500"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t('theme.barbie')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground gap-2 font-normal"
            aria-label={t('auth.signOut')}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
