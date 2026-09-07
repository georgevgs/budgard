import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeAppLanguage } from '@/config/i18n';
import { LoginModal } from '@/pages/landing/components/LoginModal';
import { Header } from '@/pages/landing/components/Header';
import { Hero } from '@/pages/landing/components/Hero';
import { FeatureTour } from '@/pages/landing/components/FeatureTour';
import { Scan } from '@/pages/landing/components/Scan';
import { Privacy } from '@/pages/landing/components/Privacy';
import { Pricing } from '@/pages/landing/components/Pricing';
import { Faq } from '@/pages/landing/components/Faq';
import { FinalCta } from '@/pages/landing/components/FinalCta';
import { Footer } from '@/pages/landing/components/Footer';
import { saveUpgradeIntent } from '@/constants/upgradeIntent';
import type { ProPlanId } from '@/constants/proPlans';

const LandingPage = () => {
  const { i18n } = useTranslation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  let currentLang: 'el' | 'en' = 'en';
  if (i18n.language.startsWith('el')) {
    currentLang = 'el';
  }

  const handleLanguageChange = (lang: string) => {
    void changeAppLanguage(lang);
  };

  const handleGetStarted = () => {
    setIsLoginModalOpen(true);
  };

  // The chosen plan survives the sign-in step; after auth the app reopens
  // the upgrade flow on it (useUpgradeIntent).
  const handleGetPro = (plan: ProPlanId) => {
    saveUpgradeIntent(plan);
    setIsLoginModalOpen(true);
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header onSignIn={handleGetStarted} />
      <Hero onGetStarted={handleGetStarted} />
      <FeatureTour />
      <Scan />
      <Privacy />
      <Pricing onGetStarted={handleGetStarted} onGetPro={handleGetPro} />
      <Faq />
      <FinalCta onGetStarted={handleGetStarted} />
      <Footer
        currentLang={currentLang}
        onChangeLanguage={handleLanguageChange}
      />
      <LoginModal open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
    </div>
  );
};

export default LandingPage;
