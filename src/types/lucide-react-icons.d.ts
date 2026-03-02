/**
 * Ambient module declarations for lucide-react direct icon imports.
 * Enables tree-shakeable per-icon imports without barrel overhead.
 */
declare module 'lucide-react/dist/esm/icons/*' {
  import type { LucideIcon } from 'lucide-react';
  const Component: LucideIcon;
  export default Component;
}
