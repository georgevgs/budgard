import { useAuth, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { supabase } from './supabase';
import type { ReactNode } from 'react';

export function SupabaseProvider({ children }: { children: ReactNode }) {
    const { getToken } = useAuth();
    const { user, isLoaded } = useUser();

    useEffect(() => {
        const updateSupabaseAuth = async () => {
            try {
                if (!user) {
                    await supabase.auth.signOut();
                    return;
                }

                // First get the token from Clerk using the configured template
                const token = await getToken({
                    template: 'supabase'
                });

                if (!token) {
                    console.warn('No Supabase JWT token available');
                    return;
                }

                // Create custom headers for Supabase client
                supabase.auth.setSession({
                    access_token: token,
                    refresh_token: ''
                });

                console.log('Successfully set Supabase auth headers');

            } catch (error) {
                console.error('Error updating Supabase auth:', error);
            }
        };

        // Only run this effect if the user has loaded
        if (isLoaded) {
            updateSupabaseAuth();
        }

        // Refresh token periodically while user is logged in
        const interval: ReturnType<typeof setInterval> | undefined = user
            ? setInterval(updateSupabaseAuth, 1000 * 60 * 59) // 59 minutes
            : undefined;

        // Cleanup on unmount
        return () => {
            if (interval !== undefined) {
                clearInterval(interval);
            }
        };
    }, [getToken, user, isLoaded]);

    // Return children immediately - auth is handled in background
    return children;
}