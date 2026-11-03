import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages ではリポジトリ名がパスになる
const base = "/coffee-timer/";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Coffee Timer",
        short_name: "Coffee",
        lang: "ja",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#f6f1ea",
        theme_color: "#3b2a20",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
