import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
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
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors duration-200',
        scrolled && 'border-b border-border/50 bg-background/85 backdrop-blur-xl',
        !scrolled && 'border-b border-transparent bg-background/0',
      )}
    >
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
    <span className="w-7 h-7 rounded-lg bg-foreground text-background flex items-center justify-center transition-transform group-hover:scale-105">
      <Wallet className="h-4 w-4" />
    </span>
    <span className="font-semibold tracking-tight text-[15px]">budgard</span>
  </a>
);

const renderNav = (t: (k: string) => string) => (
  <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
    <a
      href="#features"
      className="hover:text-foreground transition-colors"
    >
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
