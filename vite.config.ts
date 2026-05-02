/// <reference types="vitest/config" />
import path from "path";
import { readdir, rm } from "node:fs/promises";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import pkg from "./package.json" with { type: "json" };

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
      includeAssets: ["favicon.ico", "icon-192x192.png", "icon-512x512.png", "apple-touch-icon.png", "offline.html", "manifest.json"],
      workbox: {
        importScripts: ['/push-sw.js'],
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
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
            '@radix-ui/react-popover'
          ],
          // recharts intentionally NOT manualChunked — it's only used by lazy
          // routes (AnalyticsView, NetWorthChart). Letting Vite chunk it
          // naturally keeps it out of the entry's modulepreload list.
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'date-vendor': ['date-fns', 'react-day-picker'],
        },
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
