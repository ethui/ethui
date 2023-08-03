import { spawn, spawnSync } from "child_process";
import os from "os";
import path from "path";

// keep track of the `tauri-driver` child process
let tauriDriver;

export const config = {
  specs: ["specs/**/*.js"],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: "../target/debug/iron",
      },
    },
  ],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },

  // ensure the rust project is built since we expect this binary to exist for
  // the webdriver sessions
  onPrepare: () => spawnSync("cargo", ["build"]),

  // ensure we are running `tauri-driver` before the session starts so that we
  // can proxy the webdriver requests
  beforeSession: () =>
    (tauriDriver = spawn("tauri-driver", [], {
      stdio: [null, process.stdout, process.stderr],
    })),

  // clean up the `tauri-driver` process we spawned at the start of the session
  afterSession: () => tauriDriver.kill(),
};
