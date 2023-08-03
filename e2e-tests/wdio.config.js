import { exec, spawn, spawnSync } from "child_process";

// keep track of the `tauri-driver` child process
let tauriDriver;

export const config = {
  specs: ["./specs/**/*.e2e.js"],

  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: "/app/target/release/iron",
      },
    },
  ],

  port: 4445,
  reporters: [["spec", { addConsoleLogs: true }]],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },

  // NOTE: we run cargo build as part of .github/workflows/e2e.yml
  // and tauri-driver is started for us by ivangabriele/docker-tauri, so the following settings are not needed

  // ensure the rust project is built since we expect this binary to exist for
  // the webdriver sessions
  // onPrepare: () => spawnSync("cargo", ["build"]),

  // ensure we are running `tauri-driver` before the session starts so that we
  // can proxy the webdriver requests
  beforeSession: () =>
    (tauriDriver = spawn("tauri-driver", [], {
      stdio: [null, process.stdout, process.stderr],
    })),

  // clean up the `tauri-driver` process we spawned at the start of the session
  afterSession: () => tauriDriver.kill(),
};
