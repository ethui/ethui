const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const extensionSrc = path.resolve(__dirname, "..", "src", "extension");

module.exports = {
  experiments: { outputModule: true },
  mode: "production",
  entry: {
    popup: path.resolve(extensionSrc, "popup.tsx"),
    expanded: path.resolve(extensionSrc, "expanded.tsx"),
    background: path.resolve(extensionSrc, "background.ts"),
    content_script: path.resolve(extensionSrc, "content_script.ts"),
    content_script_main: path.resolve(extensionSrc, "content_script_main.ts"),
  },
  output: {
    path: path.join(__dirname, "../dist"),
    filename: "[name].js",
    library: { type: "module" },
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
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
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
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

  devServer: {
    static: {
      directory: path.join(__dirname, "../dist"),
    },
    hot: true,
    compress: true,
    port: 9000,
  },
};
