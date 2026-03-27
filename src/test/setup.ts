import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Automatic cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock react-i18next globally
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(`{{${k}}}`, String(v)),
          key,
        );
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock Supabase client
vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const obj: Record<string, unknown> = {};
    const methods = [
      'from', 'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'order', 'single', 'maybeSingle', 'abortSignal',
    ];
    for (const method of methods) {
      obj[method] = vi.fn(() => obj);
    }
    obj.data = null;
    obj.error = null;
    return obj;
  };

  return {
    supabase: {
      from: vi.fn(() => chain()),
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithOtp: vi.fn(),
        verifyOtp: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          download: vi.fn(),
          remove: vi.fn(),
        })),
      },
    },
  };
});
