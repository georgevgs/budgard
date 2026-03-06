import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import LoginModal from '@/components/auth/LoginModal';

const LandingPage = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { session, isLoading } = useAuth();
  const { i18n } = useTranslation();

  if (isLoading) return null;
  if (session) return <Navigate to="/expenses" replace />;

  const currentLang = i18n.language.startsWith('el') ? 'el' : 'en';

  const handleLanguageChange = (lang: string) => {
    void i18n.changeLanguage(lang);
  };

  return (
    <div className="min-h-screen">
      <div className="flex justify-end px-4 py-2">
        {renderLanguageToggle(currentLang, handleLanguageChange)}
      </div>
      <Hero onGetStarted={() => setShowLoginModal(true)} />
      <Features />
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  );
};

export default LandingPage;

const renderLanguageToggle = (
  currentLang: string,
  onChangeLanguage: (lang: string) => void,
) => (
  <div className="flex items-center gap-1">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onChangeLanguage('en')}
      className={currentLang === 'en' ? 'font-semibold' : 'text-muted-foreground'}
    >
      EN
    </Button>
    <span className="text-muted-foreground/40 text-sm">|</span>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onChangeLanguage('el')}
      className={currentLang === 'el' ? 'font-semibold' : 'text-muted-foreground'}
    >
      ΕΛ
    </Button>
  </div>
);
