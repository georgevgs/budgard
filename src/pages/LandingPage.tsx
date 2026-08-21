import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeAppLanguage } from '@/lib/i18n';
import LoginModal from '@/components/auth/LoginModal';
import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Analytics from '@/components/landing/Analytics';
import Budget from '@/components/landing/Budget';
import Scan from '@/components/landing/Scan';
import MoneyFlow from '@/components/landing/MoneyFlow';
import Privacy from '@/components/landing/Privacy';
import Pricing from '@/components/landing/Pricing';
import Faq from '@/components/landing/Faq';
import FinalCta from '@/components/landing/FinalCta';
import Footer from '@/components/landing/Footer';
import { saveUpgradeIntent } from '@/lib/upgradeIntent';
import type { ProPlanId } from '@/lib/proPlans';

const LandingPage = () => {
  const { i18n } = useTranslation();
  const [showLoginModal, setShowLoginModal] = useState(false);

  let currentLang: 'el' | 'en' = 'en';
  if (i18n.language.startsWith('el')) {
    currentLang = 'el';
  }

  const handleLanguageChange = (lang: string) => {
    void changeAppLanguage(lang);
  };

  const handleGetStarted = () => {
    setShowLoginModal(true);
  };

  // The chosen plan survives the sign-in step; after auth the app reopens
  // the upgrade flow on it (useUpgradeIntent).
  const handleGetPro = (plan: ProPlanId) => {
    saveUpgradeIntent(plan);
    setShowLoginModal(true);
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header onSignIn={handleGetStarted} />
      <Hero onGetStarted={handleGetStarted} />
      <Analytics />
      <Budget />
      <Scan />
      <MoneyFlow />
      <Privacy />
      <Pricing onGetStarted={handleGetStarted} onGetPro={handleGetPro} />
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
