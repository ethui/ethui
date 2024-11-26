import { exec } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import jsonmergepatch from "json-merge-patch";
import JSON5 from "json5";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const { target, v: version } = await yargs(hideBin(process.argv))
  .option("target", { type: "string", default: "firefox-dev" })
  .option("v", { type: "string", default: "0.0.0" })
  .parse();

const dist = `./dist/${target}`;
const basename = `${target}-${version}`;
let env = `DIST_DIR=${dist}`;
if (target.includes("dev")) {
  env = `${env} NODE_ENV=development`;
} else {
  env = `${env} NODE_ENV=production`;
}

console.log("Building", target, version);

await Promise.all([
  run("yarn run vite build --config vite/base.ts"),
  run("yarn run vite build --config vite/content.ts"),
  run("yarn run vite build --config vite/inpage.ts"),
  run("yarn run vite build --config vite/background.ts"),
  generateManifest(),
]);

switch (target) {
  case "chrome-dev":
  case "chrome":
    await run(`yarn run crx pack ${dist} -o ${basename}.crx`);
    break;

  case "firefox-dev":
    await run(`yarn run web-ext build -s ${dist} -a .`);
    await run(`mv ./ethui-dev-${version}.zip ${basename}.xpi`);
    break;

  case "firefox":
    await run(`yarn run web-ext build -s ${dist} -a .`);
    await run(`mv ./ethui-${version}.zip ${basename}.xpi`);
    break;
}

function run(cmd: string): Promise<void> {
  console.log(cmd);
  return new Promise((resolve, reject) => {
    exec(`${env} ${cmd}`, (error) => {
      if (error) {
        reject();
      } else {
        resolve();
      }
    });
  });
}

async function generateManifest() {
  console.log("Generating manifest");
  const baseManifest = JSON5.parse(
    await readFile("./manifest/base.json", { encoding: "utf8" }),
  );
  const targetManifest = JSON5.parse(
    await readFile(`./manifest/${target}.json`, { encoding: "utf8" }),
  );

  const manifest = jsonmergepatch.apply(baseManifest, targetManifest);
  manifest.version = version;
  await mkdir(dist, { recursive: true });
  await writeFile(`${dist}/manifest.json`, JSON.stringify(manifest));
}
