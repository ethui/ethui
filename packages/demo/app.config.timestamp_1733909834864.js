// app.config.ts
import { defineConfig } from "@tanstack/start/config";
import tsconfigPaths from "vite-tsconfig-paths";
var app_config_default = defineConfig({
  plugins: [tsconfigPaths()],
  routers: [
    {
      base: "/",
      name: "server",
      type: "http",
      plugins: () => [tsconfigPaths()]
    }
  ]
});
export {
  app_config_default as default
};
