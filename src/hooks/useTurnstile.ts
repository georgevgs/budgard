import {useState, useEffect, useCallback} from "react";

declare global {
    interface Window {
        turnstile: {
            render: (container: string | HTMLElement, options: any) => string;
            reset: (widgetId: string) => void;
        };
    }
}

export function useTurnstile(siteKey: string) {
    const [token, setToken] = useState<string | null>(null);
    const [widgetId, setWidgetId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load the Turnstile script
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;

        script.onload = () => setIsLoading(false);

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Reset the widget
    const reset = useCallback(() => {
        if (widgetId) {
            window.turnstile.reset(widgetId);
            setToken(null);
        }
    }, [widgetId]);

    // Render the widget
    const renderTurnstile = useCallback((container: string | HTMLElement) => {
        if (!window.turnstile || isLoading) return;

        const widgetId = window.turnstile.render(container, {
            sitekey: siteKey,
            callback: (token: string) => {
                setToken(token);
            },
            "expired-callback": () => {
                setToken(null);
            },
            "error-callback": () => {
                setToken(null);
            },
        });

        setWidgetId(widgetId);
    }, [siteKey, isLoading]);

    return {
        token,
        reset,
        renderTurnstile,
        isLoading
    };
}