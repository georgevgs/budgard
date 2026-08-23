import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { PluginOption } from 'vite';

const ROOT = path.resolve(import.meta.dirname, '..');
const SPLASH_DIRECTORY = 'public/splash';

const BRAND_ASSET_FILES = [
  'public/apple-touch-icon.png',
  'public/favicon.ico',
  'public/favicon.svg',
  'public/icon-192x192-maskable.png',
  'public/icon-192x192.png',
  'public/icon-512x512-maskable.png',
  'public/icon-512x512.png',
  'public/notification-badge.png',
  'public/og-image.png',
  'public/og-image.svg',
  'public/brand/app-icon-maskable.svg',
  'public/brand/app-icon.svg',
  'public/brand/budgard-mark-reversed.svg',
  'public/brand/budgard-mark.svg',
  ...readdirSync(path.join(ROOT, SPLASH_DIRECTORY))
    .sort()
    .map((file) => `${SPLASH_DIRECTORY}/${file}`),
];

const BRAND_ASSET_PATHS = new Set(
  BRAND_ASSET_FILES.map((file) => file.replace(/^public/, '')),
);

const ASSET_REFERENCE_PATTERN =
  /(?:https:\/\/budgard\.com)?\/[a-zA-Z0-9_./-]+\.(?:ico|jpg|png|svg)(?:\?[^"'\s>]*)?/g;

export const buildBrandAssetRevision = (): string => {
  const hash = createHash('sha256');

  for (const file of BRAND_ASSET_FILES) {
    hash.update(file);
    hash.update(readFileSync(path.join(ROOT, file)));
  }

  return hash.digest('hex').slice(0, 12);
};

export const BRAND_ASSET_REVISION = buildBrandAssetRevision();

const versionBrandAssetUrl = (value: string): string => {
  const url = new URL(value, 'https://budgard.local');

  if (!BRAND_ASSET_PATHS.has(url.pathname)) {
    return value;
  }

  url.searchParams.set('v', BRAND_ASSET_REVISION);

  if (value.startsWith('http')) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

export const versionBrandAssetReferences = (source: string): string => {
  return source.replace(ASSET_REFERENCE_PATTERN, versionBrandAssetUrl);
};

const versionManifestValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(versionManifestValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const updated: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (key === 'src' && typeof entry === 'string') {
      updated[key] = versionBrandAssetUrl(entry);
      continue;
    }

    updated[key] = versionManifestValue(entry);
  }

  return updated;
};

export const versionBrandManifest = (
  manifest: Record<string, unknown>,
): Record<string, unknown> => {
  return versionManifestValue(manifest) as Record<string, unknown>;
};

export const brandAssets = (): PluginOption => {
  return {
    name: 'brand-assets',
    transformIndexHtml: {
      order: 'pre',
      handler: versionBrandAssetReferences,
    },
  };
};
