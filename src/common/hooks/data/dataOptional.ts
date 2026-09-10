import { dataService } from '@/common/api/dataService';
import type { DataSession } from '@/common/hooks/data/dataSession';
import { loadDataSnapshot } from '@/constants/dataCache';
import { isOfflineError } from '@/constants/offlineError';

export type OnDemandDomain = 'templates' | 'notifications' | 'accountBalances';

export type OnDemandRequest = {
  controller: AbortController | null;
  promise: Promise<void> | null;
  lastFetchedAt: number | null;
};

export const DATA_FRESH_MS = 30_000;

// Private responses stay in the owner-scoped data layer. A fresh result can
// serve another consumer, but opening a screen after 30 seconds revalidates it.
export const loadOptionalData = (
  session: DataSession,
  domain: OnDemandDomain,
  isForced = false,
): Promise<void> => {
  if (!session.isActive) {
    return Promise.resolve();
  }
  let request = session.optionalRequests.get(domain);
  if (!request) {
    request = { controller: null, promise: null, lastFetchedAt: null };
    session.optionalRequests.set(domain, request);
  }
  if (!isForced && request.promise) {
    return request.promise;
  }
  if (
    !isForced &&
    request.lastFetchedAt !== null &&
    Date.now() - request.lastFetchedAt < DATA_FRESH_MS
  ) {
    return Promise.resolve();
  }
  request.controller?.abort();
  const controller = new AbortController();
  request.controller = controller;
  const current = request;
  const promise = fetchOptionalDomain(session, domain, controller.signal)
    .then(() => {
      if (controller.signal.aborted) {
        return;
      }
      current.lastFetchedAt = Date.now();
      session.setters.setLoadedOptionalDomains((domains) => {
        if (domains.includes(domain)) {
          return domains;
        }

        return [...domains, domain];
      });
    })
    .catch((error: unknown) => {
      controller.signal.throwIfAborted();
      if (isOfflineError(error) && hasOfflineData(session, domain, current)) {
        return;
      }
      throw error;
    })
    .finally(() => {
      if (current.promise === promise) {
        current.promise = null;
      }
    });
  current.promise = promise;

  return promise;
};

const hasOfflineData = (
  session: DataSession,
  domain: OnDemandDomain,
  request: OnDemandRequest,
): boolean => {
  if (request.lastFetchedAt !== null) {
    return true;
  }
  const snapshot = loadDataSnapshot(session.spaceKey);
  if (!snapshot) {
    return false;
  }
  if (snapshot.loadedOptionalDomains) {
    return snapshot.loadedOptionalDomains.includes(domain);
  }

  return snapshot.secondaryLoaded;
};

export const refreshOptionalData = async (
  session: DataSession,
): Promise<void> => {
  await Promise.all(
    [...session.optionalRequests.keys()].map((domain) =>
      loadOptionalData(session, domain, true),
    ),
  );
};

const fetchOptionalDomain = async (
  session: DataSession,
  domain: OnDemandDomain,
  signal: AbortSignal,
): Promise<void> => {
  if (domain === 'templates') {
    const templates = await dataService.getTemplates(session.ownerId, signal);
    signal.throwIfAborted();
    session.setters.setTemplates(templates);

    return;
  }
  if (domain === 'accountBalances') {
    const balances = await dataService.getAllAccountBalances(
      session.ownerId,
      signal,
    );
    signal.throwIfAborted();
    session.setters.setAccountBalances(balances);

    return;
  }
  const notifications = await dataService.getNotificationSettings(signal);
  signal.throwIfAborted();
  session.setters.setDailyReminderHour(
    notifications?.daily_reminder_hour ?? null,
  );
  session.setters.setNotificationPreferences(
    notifications?.notification_preferences ?? {},
  );
};
