import path from "node:path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tsconfigPaths from "vite-tsconfig-paths";

const dist = process.env.DIST_DIR || "dist/dev";

const fetchVersion = () => {
  return {
    name: "html-transform",
    transformIndexHtml(html: string) {
      return html.replace(
        /__APP_VERSION__/,
        `v${process.env.npm_package_version}`,
      );
    },
  };
};

export default defineConfig({
  root: "src",
  plugins: [
    fetchVersion(),
    nodePolyfills({
      exclude: ["fs"],
    }),
    tsconfigPaths({ parseNative: true }),
  ],
  build: {
    minify: false,
    emptyOutDir: false,
    outDir: path.resolve(__dirname, "..", dist),
    lib: {
      formats: ["iife"],
      entry: path.resolve(__dirname, "..", "src", "inpage", "index.ts"),
      name: "Iron Wallet - inpage script",
    },
    rollupOptions: {
      output: {
        entryFileNames: "inpage/inpage.js",
        extend: true,
      },
    },
  },
});
