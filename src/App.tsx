import { useState, useEffect } from 'react';
import { LandingPage } from '@/pages/landing-page';
import { ExpenseList } from '@/components/expenses/expense-list';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';
import { getSession, onAuthStateChange } from '@/lib/auth';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = onAuthStateChange(setSession);
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {session && <Header />}
      <main className="flex-1">
        {!session ? (
          <LandingPage />
        ) : (
          <div className="container mx-auto">
            <ExpenseList />
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}

export default App;