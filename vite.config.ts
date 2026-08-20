import path from "path";
import { readFileSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import pkg from "./package.json" with { type: "json" };
import { designTokens } from "./plugins/designTokens.ts";

// Function-form manualChunks: the previous array form only captured each
// package's entry module, so secondary entry points (e.g. react-dom/client's
// actual implementation, ~170 KB min) leaked into the app entry chunk and got
// cache-busted on every deploy. Matching on the package directory captures
// every module of the package. Anything unmatched returns undefined so
// dynamic-import-only packages (recharts, browser-image-compression, ...)
// keep their natural lazy chunks.
//
// Only group a package here when it is EITHER genuinely needed at boot
// (react, supabase) OR must be kept whole and off the critical path
// (sentry). Grouping anything else backfires: rolldown hoists a shared
// module into whichever named chunk already exists, so one eager import can
// drag in the whole group. `@radix-ui/react-slot` (eager via Button) used to
// land in a "ui-vendor" group holding dialog/select/popover/dropdown, and
// that group in turn statically imported a "date-vendor" group — 192 KB raw
// preloaded for a component that needs none of it. Removing the ui/form/date
// groups cut the initial critical path from 260.7 to 204.0 kB gzip. Leave
// react-hook-form, zod, date-fns, react-day-picker and radix unmatched:
// Vite chunks them per-route, which is what we want.
const matchesPackage = (id: string, packages: string[]): boolean =>
  packages.some((pkg) => id.includes(`node_modules/${pkg}/`));

const chunkForModule = (id: string): string | undefined => {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  // Whole Sentry SDK (loaded lazily via src/lib/sentry.ts) in one chunk.
  if (matchesPackage(id, ["@sentry", "@sentry-internal"])) {
    return "sentry";
  }

  if (
    matchesPackage(id, [
      "react",
      "react-dom",
      "react-router",
      "react-router-dom",
      "scheduler",
    ])
  ) {
    return "react-vendor";
  }

  // Supabase realtime client cannot be tree-shaken (statically imported
  // by SupabaseClient), so isolate the whole scope into its own
  // chunk. Entry shrinks; supabase parses in parallel.
  if (matchesPackage(id, ["@supabase"])) {
    return "supabase-vendor";
  }

  return undefined;
};

// One id per deploy, present in BOTH the app bundle (via `define` →
// `__BUILD_ID__`) and the service worker (stamped into dist/push-sw.js by
// stampPushSwBuildId below). Before offering an update, the app asks the
// waiting worker for its build id and compares — that's how a genuinely new
// deploy is told apart from iOS re-installing the same bytes after a process
// kill (which parks an identical worker in the waiting slot and used to
// trigger a false "Update available" prompt). Netlify exposes the commit SHA
// as COMMIT_REF; local builds ask git directly.
const resolveBuildId = (): string => {
  if (process.env.COMMIT_REF) {
    return process.env.COMMIT_REF;
  }

  try {
    return execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
  } catch {
    return "dev";
  }
};

const buildId = resolveBuildId();

const BUILD_ID_PLACEHOLDER = "__BUDGARD_BUILD_ID__";

// Replaces the placeholder in dist/push-sw.js with the real build id.
// Runs in closeBundle with normal enforce, so it executes BEFORE
// vite-plugin-pwa:build (enforce "post") generates sw.js — the precache
// manifest revision for push-sw.js is therefore computed from the final,
// stamped bytes.
const stampPushSwBuildId = (): PluginOption => ({
  name: "stamp-push-sw-build-id",
  apply: "build",
  closeBundle: async () => {
    const file = path.resolve(import.meta.dirname, "dist/push-sw.js");
    const source = await readFile(file, "utf8");

    if (!source.includes(BUILD_ID_PLACEHOLDER)) {
      throw new Error(
        "push-sw.js is missing the build-id placeholder — the update-prompt handshake would silently break"
      );
    }

    await writeFile(file, source.replaceAll(BUILD_ID_PLACEHOLDER, buildId));
  },
});

// Version-stamped base path for the self-hosted Tesseract OCR runtime
// (worker + wasm cores, served under /ocr/). Deriving it from the installed
// package keeps the served assets in lockstep with the tesseract.js API —
// worker, core and JS entry are protocol-coupled, so checked-in copies could
// silently drift on upgrade and break at runtime — and cache-busts the
// immutable /ocr/* URLs whenever the package is bumped.
const ocrAssetBase = ((): string => {
  const { version } = JSON.parse(
    readFileSync(
      path.resolve(import.meta.dirname, "node_modules/tesseract.js/package.json"),
      "utf8"
    )
  ) as { version: string };

  return `/ocr/tesseract-${version}`;
})();

const OCR_VENDOR_FILES = [
  "tesseract.js/dist/worker.min.js",
  "tesseract.js-core/tesseract-core-lstm.wasm.js",
  "tesseract.js-core/tesseract-core-simd-lstm.wasm.js",
  "tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js",
];

// Ships the OCR runtime from node_modules: copied into dist/ocr/ on build,
// streamed straight from node_modules in dev. Traineddata is NOT handled
// here — it lives in public/ocr/tessdata/ (not npm-versioned; refresh by
// re-downloading from tessdata_fast and renaming the folder, because /ocr/*
// is served with immutable cache headers).
const vendorOcrAssets = (): PluginOption => {
  let isBuild = false;

  return {
    name: "vendor-ocr-assets",
    configResolved: (config) => {
      isBuild = config.command === "build";
    },
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];

        if (!url || !url.startsWith(`${ocrAssetBase}/`)) {
          next();
          return;
        }

        const requested = path.posix.basename(url);
        const source = OCR_VENDOR_FILES.find(
          (file) => path.posix.basename(file) === requested
        );

        if (!source) {
          next();
          return;
        }

        readFile(path.resolve(import.meta.dirname, "node_modules", source))
          .then((contents) => {
            res.setHeader("Content-Type", "text/javascript");
            res.end(contents);
          })
          .catch(() => {
            res.statusCode = 404;
            res.end();
          });
      });
    },
    closeBundle: async () => {
      if (!isBuild) {
        return;
      }

      const outDir = path.resolve(import.meta.dirname, `dist${ocrAssetBase}`);
      await mkdir(outDir, { recursive: true });

      for (const file of OCR_VENDOR_FILES) {
        await copyFile(
          path.resolve(import.meta.dirname, "node_modules", file),
          path.join(outDir, path.posix.basename(file))
        );
      }
    },
  };
};

// Belt-and-braces: Sentry's plugin deletes maps after upload, but only when
// SENTRY_AUTH_TOKEN is set. A deploy without the token (e.g. preview build)
// would otherwise ship .map files alongside the JS bundle, leaking source.
const stripSourceMaps = (): PluginOption => ({
  name: "strip-source-maps",
  apply: "build",
  enforce: "post",
  closeBundle: async () => {
    const dist = path.resolve(import.meta.dirname, "dist");

    const walk = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.name.endsWith(".map")) {
          await rm(full, { force: true });
        }
      }
    };

    await walk(dist);
  },
});

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(buildId),
    __OCR_ASSET_BASE__: JSON.stringify(ocrAssetBase),
  },
  plugins: [
    react(),
    designTokens(),
    stampPushSwBuildId(),
    vendorOcrAssets(),
    VitePWA({
      registerType: "prompt",
      manifest: false,
      // No `includeAssets`: globPatterns below already matches every png and
      // json in dist/. Listing them again added a redundant second precache
      // entry for each (icon-512, icon-192, apple-touch-icon, manifest.json).
      // Workbox deduplicates identical url+revision pairs, so this cost no
      // extra bandwidth — but it is a live hazard: the moment the two sources
      // disagree on a revision, workbox aborts install with
      // add-to-cache-list-conflicting-entries and the SW never activates.
      workbox: {
        importScripts: ['/push-sw.js'],
        // NOTE: we intentionally do NOT set `clientsClaim: true`. That claims on
        // EVERY activation, including background ones (worker activating because
        // all tabs closed), which makes the app reload itself unprompted. Instead
        // push-sw.js claims only when the user taps Update (SKIP_WAITING), so
        // control transfers — and the app reloads — only when asked.
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
        // The OCR runtime (worker + ~4 MB wasm cores + traineddata) must NOT
        // be precached for every user at SW install — it's fetched on demand
        // and kept via the ocr-assets runtime cache below.
        // PDF generation and telemetry are optional, user-initiated or
        // best-effort features. Preloading their ~2.3 MB of JavaScript during
        // service-worker install slows every update, including for users who
        // never export a PDF. PDF chunks move into a first-use runtime cache;
        // telemetry stays network-only.
        globIgnores: [
          "**/ocr/**",
          // Social-preview image: fetched by crawlers off our CDN, never by
          // the app itself. No reason to spend 98 KB of every SW install.
          "**/og-image.png",
          "**/assets/pdfmake-*.js",
          "**/assets/vfs_fonts-*.js",
          "**/assets/sentry-*.js",
          "**/assets/sentryHeavy-*.js",
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 2
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // OCR runtime assets: cached on first use so scans keep working
          // offline. /ocr/* URLs are immutable (version-stamped core path,
          // tessdata folder renamed on refresh), so CacheFirst is safe.
          {
            urlPattern: ({ sameOrigin, url }) =>
              sameOrigin && url.pathname.startsWith("/ocr/"),
            handler: "CacheFirst",
            options: {
              cacheName: "ocr-assets",
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Annual PDF dependencies are immutable hashed chunks. Cache them
          // after the first export so later exports work offline without
          // charging every service-worker install for the initial download.
          {
            urlPattern: ({ sameOrigin, url }) =>
              sameOrigin &&
              (url.pathname.startsWith("/assets/pdfmake-") ||
                url.pathname.startsWith("/assets/vfs_fonts-")),
            handler: "CacheFirst",
            options: {
              cacheName: "pdf-export-assets",
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    }),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      // Only upload during CI/CD builds (skip if no auth token)
      disable: !process.env.SENTRY_AUTH_TOKEN,
    }),
    stripSourceMaps(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: chunkForModule,
      },
    },
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js'
    ],
    exclude: ['lucide-react'],
  },
  server: {
    hmr: {
      overlay: false
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/hooks/**', 'src/services/**', 'src/components/**'],
      exclude: ['src/lib/supabase.ts', 'src/lib/i18n.ts', 'src/hooks/usePwaUpdate.ts', 'src/**/*.d.ts', 'src/components/ui/**'],
    },
  },
});
