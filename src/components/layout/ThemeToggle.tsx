import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Moon from 'lucide-react/dist/esm/icons/moon';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Check from 'lucide-react/dist/esm/icons/check';
import { useTheme } from '@/hooks/useTheme';
import {
  ACCENT_COLORS,
  useAccentColor,
  type AccentColorKey,
} from '@/hooks/useAccentColor';

type Theme = 'light' | 'dark' | 'barbie';

const ThemeToggle: React.FC = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccentColor();

  const themeIcons: Record<Theme, React.ReactNode> = {
    light: <Sun className="h-4 w-4" />,
    dark: <Moon className="h-4 w-4" />,
    barbie: <Sparkles className="h-4 w-4 text-pink-500" />,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0"
          aria-label={t('common.toggleTheme')}
        >
          {themeIcons[theme as Theme]}
          <span className="sr-only">{t('common.toggleTheme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(themeIcons) as Theme[]).map((themeName) => (
          <DropdownMenuItem
            key={themeName}
            onClick={() => setTheme(themeName)}
            className={themeName === 'barbie' ? 'text-pink-500' : ''}
          >
            {themeIcons[themeName]}
            <span className="ml-2">{t(`theme.${themeName}`)}</span>
          </DropdownMenuItem>
        ))}
        {renderAccentSection(theme === 'barbie', accent, setAccent, t)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;

const renderAccentSection = (
  isBarbie: boolean,
  accent: AccentColorKey,
  setAccent: (key: AccentColorKey) => void,
  t: (key: string) => string,
) => {
  if (isBarbie) {
    return null;
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        {t('accent.pickColor')}
      </DropdownMenuLabel>
      <div className="flex gap-1.5 px-2 py-1.5">
        {ACCENT_COLORS.map((color) => {
          const isSelected = color.key === accent;

          return (
            <button
              key={color.key}
              type="button"
              onClick={() => setAccent(color.key)}
              className="relative h-6 w-6 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ backgroundColor: color.values.swatch }}
              aria-label={t(`accent.colors.${color.key}`)}
              aria-pressed={isSelected}
            >
              {renderCheck(isSelected)}
            </button>
          );
        })}
      </div>
    </>
  );
};

const renderCheck = (isSelected: boolean) => {
  if (!isSelected) {
    return null;
  }

  return (
    <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow-sm" />
  );
};
