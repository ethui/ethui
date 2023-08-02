import type { Options } from "@wdio/types";

import { config as baseConfig } from "./wdio.conf.js";

export const config: Options.Testrunner = {
  ...baseConfig,
  specs: [["./content-script/*.test.tsx", "./popup/*.test.tsx"]],
  runner: [
    "browser",
    {
      preset: "react",
      headless: !process.env.DEBUG,
    },
  ],
  capabilities: [
    {
      browserName: "chrome",
    },
    {
      browserName: "firefox",
    },
  ],
};
