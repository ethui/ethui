// app.config.ts
import { defineConfig } from "@tanstack/start/config";
var app_config_default = defineConfig({
  routers: [
    {
      base: "/",
      name: "server",
      type: "http",
      plugins: () => [tsconfigPaths()()]
    }
  ]
});
export {
  app_config_default as default
};
