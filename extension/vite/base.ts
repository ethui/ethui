import path from "node:path";

import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const dist = process.env.DIST_DIR || "dist/dev";

const fetchVersion = () => {
  return {
    name: "html-transform",
    transformIndexHtml(html) {
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
  ],
  build: {
    minify: false,
    outDir: path.resolve(__dirname, "..", dist),
    emptyOutDir: false,
    rollupOptions: {
      input: {
        options: new URL("../src/options/index.html", import.meta.url).pathname,
        background: new URL("../src/background/index.html", import.meta.url)
          .pathname,
      },
      output: {
        entryFileNames: "[name]/[name].js",
      },
    },
  },
});
