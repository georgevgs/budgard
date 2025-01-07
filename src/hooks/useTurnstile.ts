import {useState, useEffect, useCallback, useRef} from "react";

// Global script loading state
let scriptLoading = false;
let scriptLoaded = false;

declare global {
    interface Window {
        turnstile: {
            render: (container: string | HTMLElement, params: any) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
            getResponse: (widgetId?: string) => string | undefined;
            isExpired: (widgetId?: string) => boolean;
        };
    }
}

export function useTurnstile(siteKey: string) {
    const [token, setToken] = useState<string | null>(null);
    const [widgetId, setWidgetId] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const containerRef = useRef<HTMLElement | null>(null);

    // Load script once globally
    useEffect(() => {
        if (scriptLoaded) {
            setIsReady(true);
            return;
        }

        if (scriptLoading) {
            return;
        }

        const loadScript = () => {
            scriptLoading = true;

            const script = document.createElement("script");
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";

            script.onload = () => {
                scriptLoaded = true;
                scriptLoading = false;
                setIsReady(true);
            };

            script.onerror = () => {
                scriptLoading = false;
                console.error("Failed to load Turnstile script");
            };

            document.body.appendChild(script);
        };

        loadScript();

        return () => {
            if (widgetId && window.turnstile) {
                try {
                    window.turnstile.remove(widgetId);
                } catch (e) {
                    console.error("Error removing Turnstile widget:", e);
                }
            }
        };
    }, []);

    const renderTurnstile = useCallback((container: HTMLElement) => {
        if (!container || !isReady || !window.turnstile) return;

        // Store container reference
        containerRef.current = container;

        // Remove existing widget if any
        if (widgetId) {
            try {
                window.turnstile.remove(widgetId);
            } catch (e) {
                console.error("Error removing existing widget:", e);
            }
        }

        try {
            const id = window.turnstile.render(container, {
                sitekey: siteKey,
                callback: (token: string) => {
                    setToken(token);
                },
                "theme": "auto",
                "refresh-expired": "auto",
                "retry": "auto",
                "retry-interval": 8000,
                "error-callback": () => {
                    setToken(null);
                },
                "expired-callback": () => {
                    setToken(null);
                }
            });

            setWidgetId(id);
        } catch (e) {
            console.error("Error rendering Turnstile widget:", e);
        }
    }, [siteKey, isReady, widgetId]);

    const reset = useCallback(() => {
        if (!widgetId || !window.turnstile) return;
        try {
            window.turnstile.reset(widgetId);
            setToken(null);
        } catch (e) {
            console.error("Error resetting Turnstile widget:", e);
        }
    }, [widgetId]);

    return {
        token,
        reset,
        renderTurnstile,
        isReady,
        isExpired: useCallback(() => {
            if (!widgetId || !window.turnstile) return true;
            return window.turnstile.isExpired(widgetId);
        }, [widgetId]),
        getToken: useCallback(() => {
            if (!widgetId || !window.turnstile) return undefined;
            return window.turnstile.getResponse(widgetId);
        }, [widgetId])
    };
}