import fs from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const manifestPath = path.resolve(__dirname, "public/manifest.webmanifest");
const pwaManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

// Excalidraw loads its lazily-imported chunks (export/vendor libs) and locales
// from <EXCALIDRAW_ASSET_PATH>/excalidraw-assets at runtime, so the full folder
// must ship with every build and stay in sync with the installed version.
function syncExcalidrawAssets() {
  return {
    name: "sync-excalidraw-assets",
    buildStart() {
      const src = path.resolve(
        __dirname,
        "node_modules/@excalidraw/excalidraw/dist/excalidraw-assets"
      );
      const dest = path.resolve(__dirname, "public/excalidraw-assets");
      if (!fs.existsSync(src)) return;
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(src, dest, { recursive: true });
      fs.rmSync(path.join(dest, "locales"), { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  plugins: [
    syncExcalidrawAssets(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: process.env.VITE_PWA_DEV === "true",
      },
      workbox: {
        // Don't precache source maps or large chunks
        globPatterns: ["**/*.{js,css,html}", "excalidraw-assets/*.woff2"],
        globIgnores: ["**/*.map", "**/*.chunk.js"],
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "assets",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
      },
      manifest: pwaManifest,
    }),
  ],
  define: {
    "process.env.IS_PREACT": JSON.stringify("false"),
  },
});
