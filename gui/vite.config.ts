import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const host = process.env.TAURI_DEV_HOST;

const warningsToIgnore = [
  ["SOURCEMAP_ERROR", "Can't resolve original location of error"],
  ["INVALID_ANNOTATION", "contains an annotation that Rollup cannot interpret"],
];

export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    tanstackRouter({
      autoCodeSplitting: true,
    }),
    tsconfigPaths({ parseNative: true }),
    muteWarningsPlugin(warningsToIgnore),
  ],

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

// TODO: vite/rollup throw unsolved errors
// https://github.com/vitejs/vite/issues/15012#issuecomment-1825035992
const muteWarningsPlugin = (warningsToIgnore: string[][]): any => {
  const mutedMessages = new Set();
  return {
    name: "mute-warnings",
    enforce: "pre",
    config: (userConfig: any) => ({
      build: {
        rollupOptions: {
          onwarn(warning: any, defaultHandler: any) {
            if (warning.code) {
              const muted = warningsToIgnore.find(
                ([code, message]) =>
                  code === warning.code && warning.message.includes(message),
              );

              if (muted) {
                mutedMessages.add(muted.join());
                return;
              }
            }

            if (userConfig.build?.rollupOptions?.onwarn) {
              userConfig.build.rollupOptions.onwarn(warning, defaultHandler);
            } else {
              defaultHandler(warning);
            }
          },
        },
      },
    }),
    closeBundle() {
      const diff = warningsToIgnore.filter((x) => !mutedMessages.has(x.join()));
      if (diff.length > 0) {
        this.warn(
          "Some of your muted warnings never appeared during the build process:",
        );
        diff.forEach((m) => {
          this.warn(`- ${m.join(": ")}`);
        });
      }
    },
  };
};
