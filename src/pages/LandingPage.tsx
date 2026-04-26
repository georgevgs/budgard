import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LoginModal from '@/components/auth/LoginModal';
import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Analytics from '@/components/landing/Analytics';
import Budget from '@/components/landing/Budget';
import Categories from '@/components/landing/Categories';
import Privacy from '@/components/landing/Privacy';
import Pricing from '@/components/landing/Pricing';
import Faq from '@/components/landing/Faq';
import FinalCta from '@/components/landing/FinalCta';
import Footer from '@/components/landing/Footer';

const LandingPage = () => {
  const { i18n } = useTranslation();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const currentLang = i18n.language.startsWith('el') ? 'el' : 'en';

  const handleLanguageChange = (lang: string) => {
    void i18n.changeLanguage(lang);
  };

  const handleGetStarted = () => {
    setShowLoginModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSignIn={handleGetStarted} />
      <Hero onGetStarted={handleGetStarted} />
      <Analytics />
      <Budget />
      <Categories />
      <Privacy />
      <Pricing onGetStarted={handleGetStarted} />
      <Faq />
      <FinalCta onGetStarted={handleGetStarted} />
      <Footer
        currentLang={currentLang}
        onChangeLanguage={handleLanguageChange}
      />
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  );
};

export default LandingPage;
