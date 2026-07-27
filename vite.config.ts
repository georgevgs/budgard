/// <reference types="vitest/config" />
import path from "path";
import { readdir, rm } from "node:fs/promises";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import pkg from "./package.json" with { type: "json" };

// Function-form manualChunks: the previous array form only captured each
// package's entry module, so secondary entry points (e.g. react-dom/client's
// actual implementation, ~170 KB min) leaked into the app entry chunk and got
// cache-busted on every deploy. Matching on the package directory captures
// every module of the package. Anything unmatched returns undefined so
// dynamic-import-only packages (recharts, browser-image-compression, ...)
// keep their natural lazy chunks.
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

  if (
    matchesPackage(id, [
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-toast",
      "@radix-ui/react-popover",
    ])
  ) {
    return "ui-vendor";
  }

  // recharts intentionally NOT manualChunked — it's only used by lazy
  // routes (AnalyticsView, NetWorthChart). Letting Vite chunk it
  // naturally keeps it out of the entry's modulepreload list.
  if (matchesPackage(id, ["react-hook-form", "@hookform/resolvers", "zod"])) {
    return "form-vendor";
  }

  if (matchesPackage(id, ["date-fns", "react-day-picker"])) {
    return "date-vendor";
  }

  // Supabase realtime client cannot be tree-shaken (statically imported
  // by SupabaseClient), so isolate the whole scope into its own
  // chunk. Entry shrinks; supabase parses in parallel.
  if (matchesPackage(id, ["@supabase"])) {
    return "supabase-vendor";
  }

  return undefined;
};

// Belt-and-braces: Sentry's plugin deletes maps after upload, but only when
// SENTRY_AUTH_TOKEN is set. A deploy without the token (e.g. preview build)
// would otherwise ship .map files alongside the JS bundle, leaking source.
const stripSourceMaps = (): PluginOption => ({
  name: "strip-source-maps",
  apply: "build",
  enforce: "post",
  closeBundle: async () => {
    const dist = path.resolve(__dirname, "dist");

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
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: false,
      includeAssets: ["favicon.ico", "icon-192x192.png", "icon-512x512.png", "apple-touch-icon.png", "manifest.json"],
      workbox: {
        importScripts: ['/push-sw.js'],
        // NOTE: we intentionally do NOT set `clientsClaim: true`. That claims on
        // EVERY activation, including background ones (worker activating because
        // all tabs closed), which makes the app reload itself unprompted. Instead
        // push-sw.js claims only when the user taps Update (SKIP_WAITING), so
        // control transfers — and the app reloads — only when asked.
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
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
      "@": path.resolve(__dirname, "./src"),
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
