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

const nodePolyfillsFix = (options?: PolyfillOptions | undefined): Plugin => {
  const origPlugin = nodePolyfills(options);
  return {
    ...origPlugin,
    resolveId(this, source: string, importer: string | undefined, opts: any) {
      const m =
        /^vite-plugin-node-polyfills\/shims\/(buffer|global|process)$/.exec(
          source,
        );
      if (m) {
        return `node_modules/vite-plugin-node-polyfills/shims/${m[1]}/dist/index.cjs`;
      } else {
        if (typeof origPlugin.resolveId === "function") {
          return origPlugin.resolveId.call(this, source, importer, opts);
        }
      }
    },
  };
};

export default defineConfig({
  plugins: [
    nodePolyfillsFix({
      exclude: ["fs"],
    }),
    fetchVersion(),
    tsconfigPaths({ parseNative: true }),
    webExtension({
      additionalInputs: [
        "src/inpage/index.ts",
        "src/devtools/index.html",
        "src/panel/index.html",
      ],
      webExtConfig: {
        startUrl: "http://localhost:3000",
      },
    }),
  ],
});
