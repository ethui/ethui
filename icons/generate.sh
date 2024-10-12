#!/usr/bin/env bash

pwd
exit 0
# cleanup
rm -rf gui/public/logo
rm -rf extension/src/public/icons
rm -rf bin/icons*
mkdir -p gui/public/logo
mkdir -p extension/src/public/icons

# white icons for tauri production
cargo tauri icon --output bin/icons icons/symbol-white.png

# purple icons for tauri dev
cargo tauri icon --output bin/icons-dev icons/symbol-purple.png

# all icons for gui
cp icons/symbol-{white,black,purple}.svg gui/public/logo/

for size in 16 48 96 128; do
  for color in purple white black; do
    convert icons/symbol-$color.png -resize ${size}x extension/src/public/icons/ethui-$color-$size.png
  done
done
