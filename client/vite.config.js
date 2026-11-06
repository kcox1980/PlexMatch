import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "PlexMatch",
        short_name: "PlexMatch",
        description: "Pick what to watch together",
        theme_color: "#14141a",
        background_color: "#14141a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/image/,
            handler: "CacheFirst",
            options: { cacheName: "plex-posters", expiration: { maxEntries: 500 } },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://localhost:4100",
      },
    },
  },
});
