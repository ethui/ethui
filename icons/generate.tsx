import fs from "node:fs";
import { EthuiLogo } from "@ethui/ui/components/ethui-logo";
import { $ } from "bun";
import React from "react";
import ReactDOMServer from "react-dom/server";

const AllColors = {
  light: {
    "fill-background": "#ffffff",
    "fill-foreground": "#0a0a0a",
    "fill-destructive": "#EF4444",
  },
  dark: {
    "fill-background": "#0a0a0a",
    "fill-foreground": "#ffffff",
    "fill-destructive": "#EF4444",
  },
  dev: {
    "fill-background": "#ffffff",
    "fill-foreground": "#0a0a0a",
    "fill-destructive": "#EF4444",
    "fill-dev": "#8d64d1",
  },
};

interface Opts {
  mode: "light" | "dark";
  dev?: boolean;
  attention?: boolean;
}

async function gen(path: string, opts: Opts) {
  const { mode, ...props } = opts;

  console.log(`generating ${path}`);
  let svgString = ReactDOMServer.renderToStaticMarkup(
    <EthuiLogo size={600} {...props} />,
  );
  svgString = svgString.replace(
    'class="fill-dev"',
    `fill="${AllColors.dev["fill-dev"]}"`,
  );

  let colors = AllColors.light;
  if (mode === "dark") {
    colors = AllColors.dark;
  }

  svgString = svgString.replaceAll(
    'class="fill-background"',
    `fill="${colors["fill-background"]}"`,
  );
  svgString = svgString.replaceAll(
    'class="fill-foreground"',
    `fill="${colors["fill-foreground"]}"`,
  );
  svgString = svgString.replaceAll(
    'class="fill-destructive"',
    `fill="${colors["fill-destructive"]}"`,
  );

  const svgPath = `./icons/${path}.svg`;
  const pngPath = `./icons/${path}.png`;
  fs.writeFileSync(svgPath, svgString);

  await $`magick ${svgPath} -resize 600x600 ${pngPath}`;
}

const dev = true;
const attention = true;

await gen("symbol-black", { mode: "light" });
await gen("symbol-white", { mode: "dark" });
await gen("symbol-purple", { mode: "light", dev: true });
await gen("symbol-black-attention", { mode: "light", attention });
await gen("symbol-white-attention", { mode: "dark", attention });
await gen("symbol-purple-attention", { mode: "light", dev, attention });

console.log("copying production icons to bin/icons");
await $`cargo tauri icon --output bin/icons icons/symbol-black.png 2> /dev/null`;

console.log("copying dev icons to bin/icons-dev");
await $`cargo tauri icon --output bin/icons-dev icons/symbol-purple.png 2> /dev/null`;

console.log("copying production icons to gui/public/logo");
await $`cp icons/symbol-{white,black,purple}.svg gui/public/logo/`;

for (const size of [16, 48, 96, 128]) {
  for (const color of ["purple", "white", "black"]) {
    for (const attention of ["", "-attention"]) {
      const svg = `icons/symbol-${color}${attention}.svg`;
      const png = `icons/symbol-${color}${attention}-${size}.png`;
      console.log(`[extension] ${png}`);
      await $`magick ${svg} -resize ${size}x extension/src/public/icons/ethui-${color}${attention}-${size}.png`;
    }
  }
}
