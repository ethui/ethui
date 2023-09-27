import path from "node:path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const dist = process.env.DIST_DIR || "dist/dev";

export default defineConfig({
  root: "src",
  plugins: [
    nodePolyfills({
      exclude: ["fs"],
    }),
  ],
  define: {
    "process.env": {},
  },
  build: {
    minify: false,
    emptyOutDir: false,
    outDir: path.resolve(__dirname, "..", dist),
    lib: {
      formats: ["iife"],
      entry: path.resolve(__dirname, "..", "src", "content-script", "index.ts"),
      name: "Iron Wallet - Content Script",
    },
    rollupOptions: {
      output: {
        entryFileNames: "contentScript/index.js",
        extend: true,
      },
    },
  },
});
