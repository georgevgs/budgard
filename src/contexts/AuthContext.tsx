import {createContext, useContext, useEffect, useState, ReactNode} from "react";
import type {Session} from "@supabase/supabase-js";
import {getSession, onAuthStateChange} from "@/lib/auth";

interface AuthContextType {
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({children}: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const initializeSession = async () => {
            try {
                const {data: {session: initialSession}} = await getSession();
                if (!mounted) return;
                setSession(initialSession);
            } catch (error) {
                console.error("Failed to get session:", error);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        initializeSession();

        const {data: {subscription}} = onAuthStateChange((newSession) => {
            if (!mounted) return;
            setSession(newSession);
            setIsLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const value = {
        session,
        isLoading,
        isAuthenticated: !!session?.user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}