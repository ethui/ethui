import dts from "bun-plugin-";

await Bun.build({
  entrypoints: ["./index.ts"],
  outdir: "./dist",
  minify: true,
  plugins: [dts()],
});
