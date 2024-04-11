#!/bin/bash

env=${1:-prod}

# cleanup
rm -rf gui/public/logo
rm -rf extension/src/public/icons
rm -rf bin/icons*
mkdir -p gui/public/logo
mkdir -p extension/src/public/icons

# white icons for tauri production
cargo tauri icon --output bin/icons icons/symbol-white.png
cargo tauri icon --output bin/icons-attention icons/symbol-white-attention.png

# purple icons for tauri dev
cargo tauri icon --output bin/icons-dev icons/symbol-purple.png
cargo tauri icon --output bin/icons-dev-attention icons/symbol-purple-attention.png


cp icons/symbol-{white,black,purple}{,-attention}.svg gui/public/logo/

for size in 16 48 96 128; do
  for color in purple white black; do
    convert icons/symbol-$color.png -resize ${size}x extension/src/public/icons/ethui-$color-$size.png
    convert icons/symbol-$color-attention.png -resize ${size}x extension/src/public/icons/ethui-$color-attention-$size.png
  done
done
