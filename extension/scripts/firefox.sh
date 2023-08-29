#!/bin/sh -ue

export DIST_DIR=./dist/firefox
rm -rf $DIST_DIR

version=$(jq -r ".version" package.json)

yarn compile

yarn run vite build --config vite/chrome.ts
yarn run vite build --config vite/inpage.ts
mv $DIST_DIR/manifestv2.json $DIST_DIR/manifest.json

zip -r dist/firefox-v$version.zip $DIST_DIR
yarn run web-ext build -s $DIST_DIR -a .
mv ./iron_wallet-$version.zip dist/firefox-v$version.xpi
