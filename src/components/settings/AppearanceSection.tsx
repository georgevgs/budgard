import SurfaceCard from '@/components/common/SurfaceCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Moon from 'lucide-react/dist/esm/icons/moon';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Check from 'lucide-react/dist/esm/icons/check';
import {
  ACCENT_COLORS,
  accentSwatch,
  type AccentColorKey,
} from '@/hooks/useAccentColor';

type Theme = 'light' | 'dark' | 'barbie';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type AppearanceSectionProps = {
  theme: Theme;
  accent: AccentColorKey;
  isHapticsSupported: boolean;
  hapticsEnabled: boolean;
  onThemeSelect: (theme: Theme) => void;
  onAccentSelect: (key: AccentColorKey) => void;
  onHapticsToggle: (enabled: boolean) => void;
  t: TFunc;
};

const AppearanceSection = ({
  theme,
  accent,
  isHapticsSupported,
  hapticsEnabled,
  onThemeSelect,
  onAccentSelect,
  onHapticsToggle,
  t,
}: AppearanceSectionProps) => {
  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t('settings.appearance.title')}
      </p>
      <SurfaceCard>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm mb-2">{t('settings.appearance.theme')}</p>
            <div className="flex flex-wrap gap-2">
              {renderThemeButton('light', theme, onThemeSelect, t)}
              {renderThemeButton('dark', theme, onThemeSelect, t)}
              {renderThemeButton('barbie', theme, onThemeSelect, t)}
            </div>
          </div>
          {renderAccentPicker(theme === 'barbie', accent, onAccentSelect, t)}
          {renderHapticsToggle(
            isHapticsSupported,
            hapticsEnabled,
            onHapticsToggle,
            t,
          )}
        </div>
      </SurfaceCard>
    </section>
  );
};

export default AppearanceSection;

// --- Helpers ---

const THEME_ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  barbie: Sparkles,
};

const renderThemeButton = (
  themeName: Theme,
  currentTheme: string,
  setTheme: (theme: Theme) => void,
  t: TFunc,
) => {
  const Icon = THEME_ICONS[themeName];
  const isActive = currentTheme === themeName;

  return (
    <Button
      key={themeName}
      variant={getThemeButtonVariant(isActive)}
      size="sm"
      onClick={() => setTheme(themeName)}
      className={getThemeButtonClass(themeName, isActive)}
    >
      <Icon className="h-4 w-4 mr-1.5" />
      {t(`theme.${themeName}`)}
    </Button>
  );
};

const getThemeButtonVariant = (isActive: boolean): 'default' | 'outline' => {
  if (isActive) {
    return 'default';
  }

  return 'outline';
};

const getThemeButtonClass = (themeName: string, isActive: boolean): string => {
  // The one place a theme's own colour is shown while that theme is NOT on, so
  // it reads its swatch from the palette rather than from the live tokens.
  if (themeName === 'barbie' && !isActive) {
    return 'text-[hsl(var(--barbie-swatch))]';
  }

  return '';
};

const renderAccentPicker = (
  isBarbie: boolean,
  accent: AccentColorKey,
  setAccent: (key: AccentColorKey) => void,
  t: TFunc,
) => {
  if (isBarbie) return null;

  return (
    <div>
      <p className="text-sm mb-2">{t('settings.appearance.accentColor')}</p>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {ACCENT_COLORS.map((color) => {
          const isSelected = color.key === accent;

          return (
            <button
              key={color.key}
              type="button"
              onClick={() => setAccent(color.key)}
              className="relative h-11 w-11 rounded-full border-2 border-background ring-1 ring-border/60 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{
                backgroundColor: accentSwatch(color),
              }}
              aria-label={t(`accent.colors.${color.key}`)}
              aria-pressed={isSelected}
            >
              {renderAccentCheck(isSelected)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const renderAccentCheck = (isSelected: boolean) => {
  if (!isSelected) return null;

  return (
    <span className="absolute inset-0 m-auto flex h-6 w-6 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm">
      <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />
    </span>
  );
};

const renderHapticsToggle = (
  isSupported: boolean,
  enabled: boolean,
  onToggle: (enabled: boolean) => void,
  t: TFunc,
) => {
  if (!isSupported) return null;

  return (
    <div className="flex items-center justify-between border-t border-border/50 pt-4">
      <div>
        <p className="text-sm">{t('settings.appearance.haptics')}</p>
        <p className="text-xs text-muted-foreground">
          {t('settings.appearance.hapticsDescription')}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        aria-label={t('settings.appearance.haptics')}
      />
    </div>
  );
};
