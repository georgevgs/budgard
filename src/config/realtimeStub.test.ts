import { describe, expect, it } from 'vitest';
import { RealtimeClient } from '@supabase/realtime-js';

// Guards the alias in vite.config.ts, which keeps ~16 kB of websocket stack
// out of the entry bundle. A supabase-js upgrade that changed the import
// specifier would silently restore that weight; this fails instead.
//
// It also pins the split that makes the stub safe: the one method supabase-js
// calls on its own must never throw, and the ones only reachable from
// application code must never be silent.
describe('realtime stub', () => {
  it('is what @supabase/realtime-js resolves to', () => {
    const client = new RealtimeClient('wss://example.test', {});

    expect(() => client.channel('any')).toThrow(/stubbed out/i);
  });

  // Called internally on every auth state change. Throwing here would break
  // sign-in rather than surfacing a missing feature.
  it('never throws from the method supabase-js calls itself', () => {
    const client = new RealtimeClient('wss://example.test', {});

    expect(() => client.setAuth('token')).not.toThrow();
    expect(() => client.setAuth()).not.toThrow();
  });

  // A subscription that silently never fires is far worse to debug than an
  // immediate error naming the alias.
  it('refuses every channel operation loudly', () => {
    const client = new RealtimeClient('wss://example.test', {});

    expect(() => client.getChannels()).toThrow(/realtimeStub/);
    expect(() => client.removeAllChannels()).toThrow(/realtimeStub/);
    // Cast because TypeScript still resolves the real realtime-js types while
    // Vite substitutes the stub at bundle time — which is the combination
    // worth having: the types stay honest about the API, the bytes do not ship.
    expect(() => client.removeChannel({} as never)).toThrow(/realtimeStub/);
  });
});
