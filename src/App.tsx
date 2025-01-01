import { useState, useEffect } from "react";
import LandingPage from "@/pages/landing-page";
import ExpenseList from "@/components/expenses/expense-list";
import Header from "@/components/layout/header";
import { Toaster } from "@/components/ui/toaster";
import { getSession, onAuthStateChange } from "@/lib/auth";
import { setupDefaultCategories } from "@/lib/categories";
import type { Session } from "@supabase/supabase-js";

const App = () => {
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                setupDefaultCategories();
            }
        });

        const { data: { subscription } } = onAuthStateChange((session) => {
            setSession(session);
            if (session) {
                setupDefaultCategories();
            }
        });

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
};

export default App;