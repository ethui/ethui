// app.config.ts
import { defineConfig } from "@tanstack/start/config";
import tsconfigPaths from "vite-tsconfig-paths";
var app_config_default = defineConfig({
  routers: [
    {
      name: "client",
      type: "spa",
      handler: "./index.ts",
      target: "browser",
      plugins: () => [tsconfigPaths()]
    }
  ]
});
export {
  app_config_default as default
};
