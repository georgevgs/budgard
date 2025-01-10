import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {Toaster} from "@/components/ui/toaster";
import {useAuth} from "@/contexts/AuthContext";
import {usePwaUpdate} from "@/hooks/usePwaUpdate";
import Header from "@/components/layout/Header";
import NavTabs from "@/components/layout/NavTabs";
import ExpensesList from "@/components/expenses/ExpensesList";
import AnalyticsView from "@/components/analytics/AnalyticsView";
import LandingPage from "@/pages/LandingPage";

const App = () => {
    usePwaUpdate();
    const {session, isLoading} = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"/>
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

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
                    {session && (
                        <>
                            <Route
                                path="/expenses"
                                element={
                                    <>
                                        <Header/>
                                        <NavTabs/>
                                        <main className="flex-1">
                                            <ExpensesList/>
                                        </main>
                                    </>
                                }
                            />
                            <Route
                                path="/analytics"
                                element={
                                    <>
                                        <Header/>
                                        <NavTabs/>
                                        <main className="flex-1">
                                            <AnalyticsView/>
                                        </main>
                                    </>
                                }
                            />
                        </>
                    )}
                    <Route path="*" element={<Navigate to="/" replace/>}/>
                </Routes>
                <Toaster/>
            </div>
        </BrowserRouter>
    );
};

export default App;