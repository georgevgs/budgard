import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PluginOption } from "vite";

import {
  buildManifestColors,
  buildThemeInitScript,
  buildTokensCss,
} from "../src/design/generate.ts";

// Every colour in the app comes from src/design/tokens.ts. This plugin is what
// carries it to the four places outside the module graph that cannot import it:
//
//   src/design/tokens.generated.css  the custom properties themselves
//   index.html                       the inlined pre-paint theme script
//   netlify.toml                     the CSP sha256 that allows that script
//   public/manifest.json             browser-chrome and splash colours
//
// Files are written only when their contents would change, so a normal build
// leaves the working tree clean and `git status` after a token edit shows
// exactly which artefacts moved.

const ROOT = path.resolve(import.meta.dirname, "..");

const THEME_INIT_PLACEHOLDER = "<!--THEME_INIT-->";

const CSP_HASH_PATTERN = /'sha256-[A-Za-z0-9+/=]+'/;

const writeIfChanged = async (file: string, contents: string): Promise<boolean> => {
  const current = await readFile(file, "utf8").catch(() => null);

  if (current === contents) {
    return false;
  }

  await writeFile(file, contents);

  return true;
};

const syncTokensCss = async (): Promise<string[]> => {
  const file = path.join(ROOT, "src/design/tokens.generated.css");
  const changed = await writeIfChanged(file, buildTokensCss());

  return changed ? ["src/design/tokens.generated.css"] : [];
};

// The hash covers the script's text exactly as it lands between the <script>
// tags — compute it from the same string that is injected, never by re-parsing
// the built HTML, or the two can disagree over an invisible character.
const syncCspHash = async (script: string): Promise<string[]> => {
  const file = path.join(ROOT, "netlify.toml");
  const source = await readFile(file, "utf8");
  const hash = `'sha256-${createHash("sha256").update(script).digest("base64")}'`;

  if (!CSP_HASH_PATTERN.test(source)) {
    throw new Error(
      "netlify.toml has no sha256 in its CSP — the pre-paint theme script would be blocked",
    );
  }

  const changed = await writeIfChanged(
    file,
    source.replace(CSP_HASH_PATTERN, hash),
  );

  return changed ? ["netlify.toml"] : [];
};

const syncManifest = async (): Promise<string[]> => {
  const file = path.join(ROOT, "public/manifest.json");
  const manifest = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
  const updated = { ...manifest, ...buildManifestColors() };
  const changed = await writeIfChanged(
    file,
    `${JSON.stringify(updated, null, 2)}\n`,
  );

  return changed ? ["public/manifest.json"] : [];
};

export const designTokens = (): PluginOption => {
  const script = buildThemeInitScript();
  let isBuild = false;

  return {
    name: "design-tokens",
    configResolved: (config) => {
      isBuild = config.command === "build";
    },
    // Deliberately gated on a real build. Vitest loads this same config, and
    // src/design/tokens.test.ts is what verifies these artefacts — a plugin
    // that rewrote them first would repair the drift the test exists to catch,
    // and on Netlify the stale netlify.toml has already been read by then.
    buildStart: async function () {
      if (!isBuild) {
        return;
      }

      const written = [
        ...(await syncTokensCss()),
        ...(await syncCspHash(script)),
        ...(await syncManifest()),
      ];

      if (written.length > 0) {
        this.info(`design tokens changed — rewrote ${written.join(", ")}`);
      }
    },
    configureServer: (server) => {
      // Vitest runs its own Vite dev server, and it must get the committed
      // files untouched — see the note on buildStart.
      if (process.env.VITEST) {
        return;
      }

      // Regenerates once at dev startup, then on every token edit; the CSS
      // import picks the new file up over HMR without a restart.
      void syncTokensCss();

      server.watcher.on("change", (file) => {
        if (!file.includes(path.join("src", "design")) || file.endsWith(".generated.css")) {
          return;
        }

        void syncTokensCss();
      });
    },
    transformIndexHtml: {
      order: "pre",
      handler: (html) => {
        if (!html.includes(THEME_INIT_PLACEHOLDER)) {
          throw new Error(
            `index.html is missing ${THEME_INIT_PLACEHOLDER} — the theme would flash on every load`,
          );
        }

        return html.replace(THEME_INIT_PLACEHOLDER, `<script>${script}</script>`);
      },
    },
  };
};
