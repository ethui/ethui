import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import vitePluginImp from "vite-plugin-imp";
import tsconfigPaths from "vite-tsconfig-paths";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(() => ({
  plugins: [
    react(),
    TanStackRouterVite(),
    tsconfigPaths({ parseNative: true }),
    vitePluginImp({
      libList: [
        {
          libName: "@mui/material",
          libDirectory: "",
          camel2DashComponentName: false,
        },
        {
          libName: "@mui/icons-material",
          libDirectory: "",
          camel2DashComponentName: false,
        },
      ],
    }),
  ],

  resolve: {
    alias: [{ find: "@mui/material", replacement: "@mui/material/modern" }],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    host: host || false,
    port: 1420,
    strictPort: true,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
  },
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_"],

  build: {
    // Tauri supports es2021
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari14",
    // don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? ("esbuild" as const) : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
    isolate: true,
    threads: true,
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
}));
