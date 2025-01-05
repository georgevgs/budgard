import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage.tsx";
import ExpensesList from "@/components/expenses/ExpensesList.tsx";
import Header from "@/components/layout/Header.tsx";
import { Toaster } from "@/components/ui/toaster";
import { useSession } from "@/hooks/useSession.ts";
import { useExpenses } from "@/hooks/useExpenses.ts";
import { usePwaUpdate } from "@/hooks/usePwaUpdate.ts";

const App = () => {
    usePwaUpdate();

    const {
        session,
        categories,
        setCategories,
        expenses,
        setExpenses,
        isLoading
    } = useSession();

    const {
        handleExpenseSubmit,
        handleExpenseDelete,
        handleCategoryAdd,
    } = useExpenses(setExpenses, setCategories);

    const ExpensesContent = () => (
        <>
            <Header />
            <main className="flex-1">
                <div className="container mx-auto">
                    <ExpensesList
                        expenses={expenses}
                        categories={categories}
                        isLoading={isLoading}
                        onExpenseSubmit={handleExpenseSubmit}
                        onExpenseDelete={handleExpenseDelete}
                        onCategoryAdd={handleCategoryAdd}
                    />
                </div>
            </main>
        </>
    );

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-background flex flex-col">
                <Routes>
                    <Route
                        path="/"
                        element={
                            !session ? (
                                <main className="flex-1">
                                    <LandingPage />
                                </main>
                            ) : (
                                <Navigate to="/expenses" replace />
                            )
                        }
                    />
                    <Route
                        path="/expenses"
                        element={
                            session ? (
                                <ExpensesContent />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Toaster />
            </div>
        </BrowserRouter>
    );
};

export default App;