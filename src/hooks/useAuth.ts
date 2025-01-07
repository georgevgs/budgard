import {useState, useEffect} from "react";
import type {Session} from "@supabase/supabase-js";
import {getSession, onAuthStateChange} from "@/lib/auth";

interface AuthState {
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export function useAuth(): AuthState {
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
                console.error("Error initializing session:", error);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        initializeSession();

        // Auth state listener
        const {data: {subscription}} = onAuthStateChange((newSession) => {
            if (!mounted) return;
            setSession(newSession);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return {
        session,
        isLoading,
        isAuthenticated: !!session
    };
}