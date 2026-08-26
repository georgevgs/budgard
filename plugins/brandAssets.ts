import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { PluginOption } from 'vite';

const ROOT = path.resolve(import.meta.dirname, '..');
const SPLASH_DIRECTORY = 'public/splash';
const ICON_LAYER_DIRECTORY = 'public/brand/icon-layers';
const APPLE_SPLASH_PLACEHOLDER = '<!--APPLE_SPLASH_IMAGES-->';

type SplashSpec = {
  width: number;
  height: number;
  ratio: number;
};

type SplashOrientation = 'portrait' | 'landscape';
type SplashAppearance = 'light' | 'dark';

const SPLASH_SPECS: SplashSpec[] = [
  { width: 1024, height: 1366, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 768, height: 1024, ratio: 2 },
  { width: 820, height: 1180, ratio: 2 },
  { width: 834, height: 1112, ratio: 2 },
  { width: 810, height: 1080, ratio: 2 },
  { width: 744, height: 1133, ratio: 2 },
  { width: 440, height: 956, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 420, height: 912, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
  { width: 375, height: 667, ratio: 2 },
  { width: 320, height: 568, ratio: 2 },
];

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
  ...readdirSync(path.join(ROOT, ICON_LAYER_DIRECTORY))
    .sort()
    .map((file) => `${ICON_LAYER_DIRECTORY}/${file}`),
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

const versionBrandAssetReferences = (source: string): string => {
  return source.replace(ASSET_REFERENCE_PATTERN, versionBrandAssetUrl);
};

const buildSplashLink = (
  spec: SplashSpec,
  orientation: SplashOrientation,
  appearance: SplashAppearance,
): string => {
  let pixelWidth = spec.width * spec.ratio;
  let pixelHeight = spec.height * spec.ratio;

  if (orientation === 'landscape') {
    pixelWidth = spec.height * spec.ratio;
    pixelHeight = spec.width * spec.ratio;
  }

  let appearanceSuffix = '';

  if (appearance === 'dark') {
    appearanceSuffix = '-dark';
  }

  const href = `/splash/apple-splash-${pixelWidth}-${pixelHeight}${appearanceSuffix}.jpg`;
  const media = [
    `(device-width: ${spec.width}px)`,
    `(device-height: ${spec.height}px)`,
    `(-webkit-device-pixel-ratio: ${spec.ratio})`,
    `(orientation: ${orientation})`,
    `(prefers-color-scheme: ${appearance})`,
  ].join(' and ');

  return `<link rel="apple-touch-startup-image" href="${href}" media="${media}">`;
};

const buildAppleSplashLinks = (): string => {
  const links: string[] = [];
  const orientations: SplashOrientation[] = ['portrait', 'landscape'];
  const appearances: SplashAppearance[] = ['light', 'dark'];

  for (const spec of SPLASH_SPECS) {
    for (const orientation of orientations) {
      for (const appearance of appearances) {
        links.push(buildSplashLink(spec, orientation, appearance));
      }
    }
  }

  return links.join('\n    ');
};

export const buildBrandAssetReferences = (source: string): string => {
  const expanded = source.replace(
    APPLE_SPLASH_PLACEHOLDER,
    buildAppleSplashLinks(),
  );

  return versionBrandAssetReferences(expanded);
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
      handler: buildBrandAssetReferences,
    },
  };
};
