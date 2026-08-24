import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BRAND_ASSET_REVISION,
  buildBrandAssetReferences,
  buildBrandAssetRevision,
  versionBrandManifest,
} from '../../plugins/brandAssets.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');

const read = (file: string): string => {
  return readFileSync(path.join(ROOT, file), 'utf8');
};

const collectSources = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectSources);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value).flatMap(([key, entry]) => {
    if (key === 'src' && typeof entry === 'string') {
      return [entry];
    }

    return collectSources(entry);
  });
};

describe('brand asset revisions', () => {
  it('derives a stable revision from the shipped artwork', () => {
    expect(BRAND_ASSET_REVISION).toBe(buildBrandAssetRevision());
    expect(BRAND_ASSET_REVISION).toMatch(/^[a-f0-9]{12}$/);
  });

  it('versions every iOS launch image in the rendered document', () => {
    const rendered = buildBrandAssetReferences(read('index.html'));
    const splashFiles = readdirSync(path.join(ROOT, 'public/splash')).sort();

    for (const file of splashFiles) {
      expect(rendered).toContain(`/splash/${file}?v=${BRAND_ASSET_REVISION}`);
    }

    expect(rendered.match(/rel="apple-touch-startup-image"/g)).toHaveLength(
      splashFiles.length,
    );
    expect(
      rendered.match(
        /apple-touch-startup-image[^>]+prefers-color-scheme: light/g,
      ),
    ).toHaveLength(40);
    expect(
      rendered.match(
        /apple-touch-startup-image[^>]+prefers-color-scheme: dark/g,
      ),
    ).toHaveLength(40);
  });

  it('keeps every manifest icon on the current artwork revision', () => {
    const manifest = JSON.parse(read('public/manifest.json')) as Record<
      string,
      unknown
    >;
    const expected = versionBrandManifest(manifest);

    expect(manifest).toEqual(expected);

    for (const source of collectSources(manifest)) {
      expect(source).toContain(`v=${BRAND_ASSET_REVISION}`);
    }
  });
});
