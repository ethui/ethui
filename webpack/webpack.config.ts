const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const extensionSrc = path.resolve(__dirname, "..", "src", "extension");

module.exports = {
  mode: "production",
  entry: {
    popup: path.resolve(extensionSrc, "popup.tsx"),
    expanded: path.resolve(extensionSrc, "expanded.tsx"),
    background: path.resolve(extensionSrc, "background.ts"),
  },
  output: {
    path: path.join(__dirname, "../dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".ts", ".tsx"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        loader: "html-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    // html entrypoints
    ...["popup", "expanded"].map(
      (name) =>
        new HtmlWebpackPlugin({
          template: path.join(extensionSrc, `${name}.html`),
          filename: `${name}.html`,
          chunks: [name],
          cache: false,
        })
    ),

    // manifest
    new CopyPlugin({
      patterns: [
        { from: ".", to: ".", context: "public" },
        { from: "manifest.json", to: "manifest.json" },
      ],
    }),
  ],
};
