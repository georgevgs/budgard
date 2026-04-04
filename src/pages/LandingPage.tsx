import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import LoginModal from '@/components/auth/LoginModal';

const LandingPage = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { i18n } = useTranslation();

  const currentLang = i18n.language.startsWith('el') ? 'el' : 'en';

  const handleLanguageChange = (lang: string) => {
    void i18n.changeLanguage(lang);
  };

  const handleGetStarted = () => {
    setShowLoginModal(true);
  };

  return (
    <div className="min-h-screen">
      {renderHeader(currentLang, handleLanguageChange, handleGetStarted)}
      <Hero onGetStarted={handleGetStarted} />
      <Features />
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  );
};

export default LandingPage;

const renderHeader = (
  currentLang: string,
  onChangeLanguage: (lang: string) => void,
  onGetStarted: () => void,
) => (
  <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
    <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Wallet className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold tracking-tight text-sm">budgard</span>
      </div>

      <div className="flex items-center gap-1">
        {renderLanguageToggle(currentLang, onChangeLanguage)}
        <Button size="sm" onClick={onGetStarted} className="ml-1">
          Sign In
        </Button>
      </div>
    </div>
  </header>
);

const renderLanguageToggle = (
  currentLang: string,
  onChangeLanguage: (lang: string) => void,
) => (
  <div className="flex items-center gap-1">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onChangeLanguage('en')}
      className={
        currentLang === 'en'
          ? 'font-semibold text-xs h-8 px-2'
          : 'text-muted-foreground text-xs h-8 px-2'
      }
    >
      EN
    </Button>
    <span className="text-muted-foreground/40 text-sm">|</span>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onChangeLanguage('el')}
      className={
        currentLang === 'el'
          ? 'font-semibold text-xs h-8 px-2'
          : 'text-muted-foreground text-xs h-8 px-2'
      }
    >
      ΕΛ
    </Button>
  </div>
);
