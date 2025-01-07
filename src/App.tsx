import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {Toaster} from "@/components/ui/toaster";
import {useAuth} from "@/hooks/useAuth";
import {DataOperations, useAppData} from "@/hooks/useOptimizedData";
import Header from "@/components/layout/Header.tsx";
import ExpensesList from "@/components/expenses/ExpensesList.tsx";
import {usePwaUpdate} from "@/hooks/usePwaUpdate.ts";
import LandingPage from "@/pages/LandingPage.tsx";
import {Expense} from "@/types/Expense.ts";
import {Category} from "@/types/Category.ts";
import {Budget} from "@/types/Budget.ts";
import {Session} from "@supabase/supabase-js";

interface ExpensesContentProps {
    expenses: Expense[];
    categories: Category[];
    budget: Budget | null;
    session: Session | null;
    isLoading: boolean;
    operations: DataOperations;
}

const ExpensesContent = ({
    expenses,
    categories,
    budget,
    session,
    isLoading,
    operations
}: ExpensesContentProps) => (
    <>
        <Header/>
        <main className="flex-1">
            <div className="container mx-auto">
                <ExpensesList
                    expenses={expenses}
                    categories={categories}
                    budget={budget}
                    session={session}
                    isLoading={isLoading}
                    operations={operations}
                />
            </div>
        </main>
    </>
);

const App = () => {
    usePwaUpdate();

    const {session, isAuthenticated} = useAuth();
    const {
        categories,
        expenses,
        budget,
        isLoading,
        operations
    } = useAppData(isAuthenticated, session?.user?.id);

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-background flex flex-col">
                <Routes>
                    <Route
                        path="/"
                        element={
                            !session ? (
                                <main className="flex-1">
                                    <LandingPage/>
                                </main>
                            ) : (
                                <Navigate to="/expenses" replace/>
                            )
                        }
                    />
                    <Route
                        path="/expenses"
                        element={
                            session ? (
                                <ExpensesContent
                                    expenses={expenses}
                                    categories={categories}
                                    budget={budget}
                                    session={session}
                                    isLoading={isLoading}
                                    operations={operations}
                                />
                            ) : (
                                <Navigate to="/" replace/>
                            )
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace/>}/>
                </Routes>
                <Toaster/>
            </div>
        </BrowserRouter>
    );
};

export default App;