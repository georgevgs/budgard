import { useState } from 'react';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { LoginModal } from '@/components/auth/login-modal';

export function LandingPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div className="min-h-screen">
      <Hero onGetStarted={() => setShowLoginModal(true)} />
      <Features />
      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal}
      />
    </div>
  );
}