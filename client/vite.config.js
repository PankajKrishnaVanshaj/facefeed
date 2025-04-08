import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Define the PWA manifest
const manifestForPlugin = {
  registerType: "autoUpdate", // Automatically register and update the service worker
  includeAssets: ["favicon.ico", "apple-touch-icon.png"], // Additional assets
  manifest: {
    name: "PK Facefeed - Connect and Chat Randomly",
    short_name: "PK Facefeed",
    description:
      "PK Facefeed is a social media platform for chatting and meeting random friends worldwide. Connect, chat, and have fun!",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    theme_color: "#181818",
    background_color: "#e8eac2",
    display: "standalone",
    scope: "/",
    start_url: "/", // Ensure this aligns with your app's root path
    orientation: "portrait",
  },
};

export default defineConfig({
  build: {
    sourcemap: true, // Ensure sourcemaps are enabled for production
  },
  plugins: [
    react(), // React plugin for Vite
    VitePWA(manifestForPlugin), // PWA plugin with the specified manifest
  ],
});
