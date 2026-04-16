import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Disable Cloudflare Workers plugin — build for Node.js (required for Vercel)
  cloudflare: false,
});
