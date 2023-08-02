import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const fetchVersion = () => {
  return {
    name: "html-transform",
    transformIndexHtml(html) {
      return html.replace(
        /__APP_VERSION__/,
        `v${process.env.npm_package_version}`
      );
    },
  };
};

export default defineConfig({
  plugins: [
    fetchVersion(),
    nodePolyfills({
      exclude: ["fs"],
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        options: new URL("./options/index.html", import.meta.url).pathname,
        background: new URL("./background/index.html", import.meta.url)
          .pathname,
      },
      output: {
        entryFileNames: "[name]/[name].js",
      },
    },
  },
});
