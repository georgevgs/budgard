import type { ReactElement } from "react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/AuthContext";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";

// Lazy load heavy components
const Header = lazy(() => import("@/components/layout/Header"));
const NavTabs = lazy(() => import("@/components/layout/NavTabs"));
const ExpensesList = lazy(() => import("@/components/expenses/ExpensesList"));
const AnalyticsView = lazy(() => import("@/components/analytics/AnalyticsView"));
const RecurringExpensesList = lazy(() => import("@/components/recurring/RecurringExpensesList"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));

const App = () => {
  usePwaUpdate();
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return renderLoadingState();
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background flex flex-col">
        <Suspense fallback={renderLoadingState()}>
          <Routes>
            <Route path="/" element={renderHomeRoute(session)} />
            {renderAuthenticatedRoutes(session)}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </div>
    </BrowserRouter>
  );
};

const renderLoadingState = (): ReactElement => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

const renderHomeRoute = (session: Session | null): ReactElement => {
  if (session) {
    return <Navigate to="/expenses" replace />;
  }

  return (
    <main className="flex-1">
      <LandingPage />
    </main>
  );
};

const renderAuthenticatedRoutes = (session: Session | null): ReactElement | null => {
  if (!session) {
    return null;
  }

  const LayoutWrapper = ({ children }: { children: ReactElement }) => {
    return (
      <>
        <Header />
        <NavTabs />
        <main className="flex-1">
          {children}
        </main>
      </>
    );
  };

  return (
    <>
      <Route
        path="/expenses"
        element={
          <LayoutWrapper>
            <ExpensesList />
          </LayoutWrapper>
        }
      />
      <Route
        path="/recurring"
        element={
          <LayoutWrapper>
            <RecurringExpensesList />
          </LayoutWrapper>
        }
      />
      <Route
        path="/analytics"
        element={
          <LayoutWrapper>
            <AnalyticsView />
          </LayoutWrapper>
        }
      />
    </>
  );
};

export default App;
