import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify";
import clerk from "@clerk/astro";

export default defineConfig({
  integrations: [react(), tailwind(), clerk()],
  adapter: netlify(),
  output: "server",
});
