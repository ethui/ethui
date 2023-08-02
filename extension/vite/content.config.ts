import path from "node:path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

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
    emptyOutDir: false,
    outDir: path.resolve(__dirname, "..", "dist"),
    lib: {
      formats: ["iife"],
      entry: path.resolve(__dirname, "..", "src", "content-script", "index.ts"),
      name: "Cat Facts",
    },
    rollupOptions: {
      output: {
        entryFileNames: "contentScript/index.js",
        extend: true,
      },
    },
  },
});
