#!/bin/sh -ue

export DIST_DIR=./dist/chrome
rm -rf $DIST_DIR

version=$(jq -r ".version" package.json)

yarn compile

yarn run vite build --config vite/chrome.ts
yarn run vite build --config vite/inpage.ts
rm $DIST_DIR/manifestv2.json

zip -r ./dist/chrome-v$version.zip $DIST_DIR
yarn run crx pack $DIST_DIR -o ./dist/chrome-v$version.crx
