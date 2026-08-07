import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
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
    <img
      src="/icon-192x192.png"
      alt=""
      aria-hidden="true"
      className="h-7 w-7 rounded-lg transition-transform group-hover:scale-105"
    />
    <span className="font-display font-semibold tracking-[-0.025em] text-[15px]">
      Budgard
    </span>
  </a>
);

const getHeaderClassName = (scrolled: boolean) => {
  if (scrolled) {
    return cn(
      'sticky top-0 z-50 transition-colors duration-200',
      'border-b border-border/50 bg-background/85 backdrop-blur-xl',
    );
  }

  return cn(
    'sticky top-0 z-50 transition-colors duration-200',
    'border-b border-transparent bg-background/0',
  );
};

const renderNav = (t: (k: string) => string) => (
  <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
    <a href="#features" className="hover:text-foreground transition-colors">
      {t('landing.nav.features')}
    </a>
    <a href="#pricing" className="hover:text-foreground transition-colors">
      {t('landing.nav.pricing')}
    </a>
    <a href="#faq" className="hover:text-foreground transition-colors">
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
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      {t('landing.nav.signIn')}
    </Button>
    <Button size="sm" onClick={onSignIn} className="rounded-full px-4">
      {t('landing.nav.getStarted')}
    </Button>
  </div>
);
