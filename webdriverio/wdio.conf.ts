import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// keep track of the `tauri-driver` child process
let tauriDriver: ReturnType<typeof spawn>;
let exit = false;

const configDir = path.resolve(__dirname, "../dev-data/integration-tests");
const application = path.resolve(
  __dirname,
  "../target/x86_64-unknown-linux-gnu/debug/ethui-test",
);
const args = [
  "--ws-port",
  "9103",
  "--stacks-port",
  "9104",
  "--config-dir",
  configDir,
];

export const config = {
  host: "127.0.0.1",
  port: 4444,
  specs: ["./specs/**/*.ts"],
  maxInstances: 1,
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: { project: "./tsconfig.json", transpileOnly: true },
  },
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": { application, args },
    },
  ],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },

  // ensure the rust project is built since we expect this binary to exist for the webdriver sessions
  onPrepare: () => {
    spawnSync("pnpm", ["app:build:test"], {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
      shell: true,
    });

    // delete any previous config dir
    spawnSync("rm", ["-rf", "integration-tests", configDir], {
      cwd: path.resolve(__dirname, "..", "dev-data"),
      stdio: "inherit",
      shell: true,
    });
  },

  // ensure we are running `tauri-driver` before the session starts so that we can proxy the webdriver requests
  beforeSession: () => {
    tauriDriver = spawn(
      path.resolve(os.homedir(), ".cargo", "bin", "tauri-driver"),
      [],
      { stdio: [null, process.stdout, process.stderr] },
    );

    tauriDriver.on("error", (error) => {
      console.error("tauri-driver error:", error);
      process.exit(1);
    });
    tauriDriver.on("exit", (code) => {
      if (!exit) {
        console.error("tauri-driver exited with code:", code);
        process.exit(1);
      }
    });
  },

  // clean up the `tauri-driver` process we spawned at the start of the session
  afterSession: () => {
    closeTauriDriver();
  },
};

function closeTauriDriver() {
  exit = true;
  tauriDriver?.kill();
}

function onShutdown(fn: any) {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
  process.on("SIGBREAK", cleanup);
}

onShutdown(() => {
  closeTauriDriver();
});
