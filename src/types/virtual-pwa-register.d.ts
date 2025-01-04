declare module 'virtual:pwa-register/react' {
    // Return type when calling the register function
    interface RegisterSWOptions {
        immediate?: boolean;
        onNeedRefresh?: () => void;
        onOfflineReady?: () => void;
        onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
        onRegisterError?: (error: any) => void;
    }

    // Type for the object returned by useRegisterSW
    interface RegisterSWHook {
        needRefresh: [boolean, (value: boolean) => void];
        offlineReady: [boolean, (value: boolean) => void];
        updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
    }

    // Type for the useRegisterSW hook
    export function useRegisterSW(options?: RegisterSWOptions): RegisterSWHook;
}