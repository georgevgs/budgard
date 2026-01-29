import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import LoginModal from '@/components/auth/LoginModal';

const LandingPage = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { session, isLoading } = useAuth();

  if (isLoading) return null;
  if (session) return <Navigate to="/expenses" replace />;

  return (
    <div className="min-h-screen">
      <Hero onGetStarted={() => setShowLoginModal(true)} />
      <Features />
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  );
};

export default LandingPage;
