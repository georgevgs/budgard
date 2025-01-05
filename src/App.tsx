import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "@/pages/landing-page";
import ExpenseList from "@/components/expenses/expense-list";
import Header from "@/components/layout/header";
import { Toaster } from "@/components/ui/toaster";
import { useSession } from "@/hooks/use-session";
import { useExpenses } from "@/hooks/use-expenses";
import { usePWAUpdate } from "@/hooks/use-pwa-update";

const App = () => {
    usePWAUpdate();

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
                    <ExpenseList
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