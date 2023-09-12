module.exports = {
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: ["^@iron/(.*)$", "^[./]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
