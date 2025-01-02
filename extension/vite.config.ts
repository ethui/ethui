import { defineConfig } from "vite";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";
import {
  nodePolyfills,
  type PolyfillOptions,
} from "vite-plugin-node-polyfills";
import tsconfigPaths from "vite-tsconfig-paths";
import { readFileSync } from "node:fs";

const browser = process.env.ETHUI_BROWSER || "chrome";
const isDev = process.env.NODE_ENV === "development";

if (isDev && browser === "firefox") {
  console.warn(
    "Using firefox for development is not currently supported.\nUse `yarn run build` instead to build a static version.\n\nFor more info: https://github.com/ethui/ethui/pull/868#issuecomment-2568520376",
  );
  process.exit(1);
}

const pkg = readJsonFile("package.json");
const template = readJsonFile("manifest.json");

if (isDev) {
  const icons: [string, string][] = Object.entries(
    template.icons as Record<string, string>,
  );

  template.icons = Object.fromEntries(
    icons.map(([size, path]: [string, string]) => [
      size,
      path.replace("black", "purple"),
    ]),
  );
}

const manifest = {
  ...template,
  version: pkg.version,
};

export default defineConfig({
  build: {
    outDir: `dist/${browser}`,
  },
  plugins: [
    nodePolyfillsFix({
      exclude: ["fs"],
    }),
    fetchVersion(),
    tsconfigPaths({ parseNative: true }),
    webExtension({
      browser,
      manifest: () => manifest,
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

function fetchVersion() {
  return {
    name: "html-transform",
    transformIndexHtml(html: string) {
      return html.replace(
        /__APP_VERSION__/,
        `v${process.env.npm_package_version}`,
      );
    },
  };
}

function nodePolyfillsFix(options?: PolyfillOptions | undefined) {
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
}
