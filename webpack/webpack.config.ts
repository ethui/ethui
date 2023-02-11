const path = require("path");

const extensionSrc = path.resolve(__dirname, "..", "src", "extension");

const CopyPlugin = require("copy-webpack-plugin");
module.exports = {
  mode: "production",
  entry: {
    background: path.resolve(extensionSrc, "background.ts"),
  },
  output: {
    path: path.join(__dirname, "../dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: ".", to: ".", context: "public" },
        { from: "manifest.json", to: "manifest.json" },
      ],
    }),
  ],
};
