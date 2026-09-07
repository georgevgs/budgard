// Every helper below a component that renders a string takes `t` as a
// parameter, because a helper is not a component and cannot call a hook. That
// made 112 files each declare their own shape for it, under two names and in
// three widths — `TFunc` and `TranslateFunction`, sometimes without the
// options bag, sometimes as `ReturnType<typeof useTranslation>['t']`.
//
// This is that type, once. It is deliberately the widest of the three: a
// helper that never passes options still accepts a `t` that would take them,
// and i18next's own `t` is assignable to it.
export type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;
