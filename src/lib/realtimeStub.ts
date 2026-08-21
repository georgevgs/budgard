// Stands in for @supabase/realtime-js, which this app does not use.
//
// supabase-js constructs a RealtimeClient in its own constructor, so the
// websocket stack — the Phoenix channel protocol, the presence and
// postgres-changes machinery, its serialiser and timers — lands in the entry
// bundle whether or not a single channel is ever opened. Budgard opens none:
// every read is a REST call and every write goes through the offline queue.
//
// The alias is in vite.config.ts. Removing this stub is the only thing needed
// to turn realtime back on.
//
// Only five methods are reachable. supabase-js calls setAuth itself on every
// auth state change, so that one has to be a silent no-op. The other four are
// reached only when application code asks for a channel, which is precisely
// the case this stub must not fail quietly — a subscription that silently
// never fires is far worse to debug than an immediate, explicit error.

const UNSUPPORTED =
  'Realtime is stubbed out in this build (see src/lib/realtimeStub.ts). ' +
  'Remove the @supabase/realtime-js alias in vite.config.ts to use channels.';

export class RealtimeClient {
  // supabase-js passes (url, options); neither is needed.
  constructor(..._args: unknown[]) {
    void _args;
  }

  // Called internally whenever the access token changes. Must not throw.
  setAuth(..._args: unknown[]): void {
    void _args;
  }

  channel(..._args: unknown[]): never {
    void _args;
    throw new Error(UNSUPPORTED);
  }

  getChannels(): never {
    throw new Error(UNSUPPORTED);
  }

  removeChannel(..._args: unknown[]): never {
    void _args;
    throw new Error(UNSUPPORTED);
  }

  removeAllChannels(): never {
    throw new Error(UNSUPPORTED);
  }
}

// Named exports the package surface carries. Re-exported so any incidental
// type-only or barrel import still resolves.
export class RealtimeChannel {}
export class RealtimePresence {}

export const REALTIME_LISTEN_TYPES = {} as const;
export const REALTIME_SUBSCRIBE_STATES = {} as const;
export const REALTIME_CHANNEL_STATES = {} as const;
export const REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {} as const;

export default RealtimeClient;
