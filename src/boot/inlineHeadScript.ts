/**
 * The single inline <script> that plugins/designTokens.ts injects into
 * index.html, and the exact string its CSP sha256 is computed from.
 *
 * Two concerns share one element on purpose: both must run before first paint
 * and neither may depend on the network, so a second tag would buy nothing but
 * a second hash to keep in step.
 */

import { buildThemeInitScript } from '../design/generate.ts';
import { buildBootGuardScript } from './bootGuard.ts';

export const buildInlineHeadScript = (): string => {
  return `${buildThemeInitScript()}\n${buildBootGuardScript()}`;
};
