import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Define the PWA manifest
const manifestForPlugin = {
  registerType: "prompt", // Service worker registration type
  includeAssets: ["favicon.ico", "apple-touch-icon.png"], // Additional assets to include
  manifest: {
    name: "PK Facefeed - Connect and Chat Randomly", // Full name of the PWA
    short_name: "PK Facefeed", // Short name for display purposes
    description:
      "PK Facefeed is a social media platform for chatting and meeting random friends worldwide. Connect, chat, and have fun!", // Description of the PWA
    icons: [
      {
        src: "/android-chrome-192x192.png", // Path to 192x192 icon
        sizes: "192x192", // Size of the icon
        type: "image/png", // File type
      },
      {
        src: "/android-chrome-512x512.png", // Path to 512x512 icon
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png", // Path to Apple touch icon
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/favicon-16x16.png", // Path to 16x16 favicon
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/favicon-32x32.png", // Path to 32x32 favicon
        sizes: "32x32",
        type: "image/png",
      },
    ],
    theme_color: "#181818", // Theme color for the PWA
    background_color: "#e8eac2", // Background color for the splash screen
    display: "standalone", // Display mode for the app
    scope: "/", // Scope of the app
    start_url: "/", // Start URL of the app
    orientation: "portrait", // Preferred orientation
  },
};

// Export the Vite configuration
export default defineConfig({
  plugins: [
    react(), // React plugin for Vite
    VitePWA(manifestForPlugin), // PWA plugin with the specified manifest
  ],
});
