#!/bin/sh

for dir in $(find . -maxdepth 3 -type f -name "package.json" -exec dirname {} \; | grep -v "node_modules"); do
  bun run --cwd $dir $@
done
