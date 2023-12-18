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
    tsconfigPaths(),
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
        devtools: new URL("../src/devtools/index.html", import.meta.url)
          .pathname,
        panel: new URL("../src/panel/index.html", import.meta.url).pathname,
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "devtools" || chunk.name === "panel"
            ? "[name]/index.js"
            : "[name]/index.js",
      },
    },
  },
});
