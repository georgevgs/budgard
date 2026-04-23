// Shared ServiceWorkerRegistration reference.
// Written by usePwaUpdate on SW registration, read by usePushNotifications
// to access pushManager.

let registration: ServiceWorkerRegistration | null = null;

export const swRegistration = {
  get: (): ServiceWorkerRegistration | null => registration,
  set: (reg: ServiceWorkerRegistration): void => {
    registration = reg;
  },
};
