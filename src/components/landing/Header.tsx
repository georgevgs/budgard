import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BrandMark from '@/components/common/BrandMark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  onSignIn: () => void;
};

const Header = ({ onSignIn }: Props) => {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={getHeaderClassName(scrolled)}>
      <div className="landing-gutter mx-auto flex h-16 max-w-6xl items-center justify-between">
        {renderWordmark()}
        {renderNav(t)}
        {renderActions(t, onSignIn)}
      </div>
    </header>
  );
};

export default Header;

const renderWordmark = () => (
  <a href="#top" className="flex items-center gap-2.5 group">
    <BrandMark className="h-7 w-7 transition-transform group-hover:scale-105" />
    <span className="type-wordmark">Budgard</span>
  </a>
);

const getHeaderClassName = (scrolled: boolean) => {
  if (scrolled) {
    return cn(
      'landing-header sticky top-0 z-50 transition-colors duration-200',
      'adaptive-material border-b border-border/50 bg-background/85 backdrop-blur-xl',
    );
  }

  return cn(
    'landing-header sticky top-0 z-50 transition-colors duration-200',
    'adaptive-material border-b border-transparent bg-background/0',
  );
};

const renderNav = (t: (k: string) => string) => (
  <nav className="hidden items-center gap-8 text-sm text-foreground md:flex">
    <a href="#features" className="transition-opacity hover:opacity-65">
      {t('landing.nav.features')}
    </a>
    <a href="#pricing" className="transition-opacity hover:opacity-65">
      {t('landing.nav.pricing')}
    </a>
    <a href="#faq" className="transition-opacity hover:opacity-65">
      {t('landing.nav.faq')}
    </a>
  </nav>
);

const renderActions = (t: (k: string) => string, onSignIn: () => void) => (
  <div className="flex items-center gap-2">
    <Button
      variant="ghost"
      size="sm"
      onClick={onSignIn}
      className="text-sm text-foreground"
    >
      {t('landing.nav.signIn')}
    </Button>
    <Button size="sm" onClick={onSignIn} className="rounded-full px-4">
      {t('landing.nav.getStarted')}
    </Button>
  </div>
);
