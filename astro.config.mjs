// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000, host: true },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        "react-confetti",
        "react-hook-form",
        "zod",
        "@hookform/resolvers/zod",
        "date-fns",
        "date-fns/locale",
        "react-day-picker",
        "@radix-ui/react-popover",
        "@radix-ui/react-alert-dialog",
        "@radix-ui/react-select",
        "@radix-ui/react-checkbox",
      ],
      exclude: [],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            confetti: ["react-confetti"],
          },
        },
      },
    },
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
