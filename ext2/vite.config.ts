import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tsconfigPaths from "vite-tsconfig-paths";

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
  plugins: [
    fetchVersion(),
    nodePolyfills({
      exclude: ["fs"],
    }),
    tsconfigPaths({ parseNative: true }),
    webExtension(),
  ],
});
