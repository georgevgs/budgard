import {useState, useEffect, useCallback, useRef} from "react";

declare global {
    interface Window {
        turnstile: {
            render: (container: string | HTMLElement, params: any) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
            getResponse: (widgetId?: string) => string | undefined;
            isExpired: (widgetId?: string) => boolean;
        };
        onloadTurnstileCallback?: () => void;
    }
}

export function useTurnstile(siteKey: string) {
    const [token, setToken] = useState<string | null>(null);
    const [widgetId, setWidgetId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const scriptRef = useRef<HTMLScriptElement | null>(null);

    // Load the Turnstile script
    useEffect(() => {
        // Check if script is already loaded
        const existingScript = document.querySelector("script[src*=\"turnstile\"]");
        if (existingScript) {
            setIsLoading(false);
            return;
        }

        // Define callback before loading script
        window.onloadTurnstileCallback = () => {
            setIsLoading(false);
        };

        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback";
        script.async = true;
        script.defer = true;
        scriptRef.current = script;

        document.body.appendChild(script);

        return () => {
            // Cleanup widget if it exists
            if (widgetId && window.turnstile) {
                try {
                    window.turnstile.remove(widgetId);
                } catch (e) {
                    console.error("Error removing Turnstile widget:", e);
                }
            }

            // Remove script if we added it
            if (scriptRef.current && document.body.contains(scriptRef.current)) {
                document.body.removeChild(scriptRef.current);
            }

            // Cleanup callback
            delete window.onloadTurnstileCallback;
        };
    }, []);

    // Reset the widget
    const reset = useCallback(() => {
        if (widgetId && window.turnstile) {
            try {
                window.turnstile.reset(widgetId);
                setToken(null);
            } catch (e) {
                console.error("Error resetting Turnstile widget:", e);
            }
        }
    }, [widgetId]);

    // Render the widget
    const renderTurnstile = useCallback((container: HTMLElement) => {
        if (!window.turnstile || isLoading) return;

        try {
            // Remove existing widget if any
            if (widgetId) {
                window.turnstile.remove(widgetId);
            }

            const id = window.turnstile.render(container, {
                sitekey: siteKey,
                callback: (token: string) => {
                    setToken(token);
                },
                "theme": "auto",
                "refresh-expired": "auto",
                "retry": "auto",
                "retry-interval": 8000,
                "refresh-timeout": "auto",
                "appearance": "always",
                "size": "normal",
                "language": "auto",
                "response-field": false,
                "execution": "render",
                "error-callback": () => {
                    setToken(null);
                },
                "expired-callback": () => {
                    setToken(null);
                },
                "timeout-callback": () => {
                    // Reset widget on timeout
                    if (widgetId) {
                        window.turnstile.reset(widgetId);
                    }
                },
                "before-interactive-callback": () => {
                    console.debug("Turnstile: Starting interactive challenge");
                },
                "after-interactive-callback": () => {
                    console.debug("Turnstile: Completed interactive challenge");
                }
            });

            setWidgetId(id);
        } catch (e) {
            console.error("Error rendering Turnstile widget:", e);
        }
    }, [siteKey, isLoading, widgetId]);

    // Check if token is expired
    const isExpired = useCallback(() => {
        if (!widgetId || !window.turnstile) return true;
        return window.turnstile.isExpired(widgetId);
    }, [widgetId]);

    // Get current token
    const getToken = useCallback(() => {
        if (!widgetId || !window.turnstile) return undefined;
        return window.turnstile.getResponse(widgetId);
    }, [widgetId]);

    return {
        token,
        reset,
        renderTurnstile,
        isLoading,
        isExpired,
        getToken
    };
}