#!/bin/bash -ue


#
# defaults
#
target=chrome
release=false

#
# parse args
#
VALID_ARGS=$(getopt -o rt:h --long release,target:,help -- "$@")
if [[ $? -ne 0 ]]; then
    exit 1;
fi

eval set -- "$VALID_ARGS"
while [ : ]; do
  case "$1" in
    -r | --release)
        release=true
        shift
        ;;
    -t | --target)
        target=$2
        shift 2
        ;;
    -h | --help)
        echo "help"
        shift
        ;;
    --) shift; 
        break 
        ;;
  esac
done

#
# building
#

export NODE_ENV=production
export DIST_DIR=./dist/$target
rm -rf $DIST_DIR

version=$(cat package.json | grep \"version\": | cut -d'"' -f 4)
basename=$target-v$version

yarn run vite build --config vite/base.ts
yarn run vite build --config vite/content.ts
yarn run vite build --config vite/inpage.ts
yarn run vite build --config vite/background.ts

case $target in
  # builds and publishes to the chrome extension store
  chrome)

    # choose manifest
    mv $DIST_DIR/manifest-chrome.json $DIST_DIR/manifest.json
    rm $DIST_DIR/manifest-firefox.json

    # bundle zip & crx
    zip -r ./dist/chrome-v$version.zip $DIST_DIR
    yarn run crx pack $DIST_DIR -o ./dist/chrome-v$version.crx
    ;;

  # builds and publishes to the firefox extension store
  firefox)
    # choose manifest
    mv $DIST_DIR/manifest-firefox.json $DIST_DIR/manifest.json
    rm $DIST_DIR/manifest-chrome.json

    # bundle zip & xpi
    zip -r dist/$basename.zip $DIST_DIR
    yarn run web-ext build -s $DIST_DIR -a .
    mv ./iron_wallet-$version.zip dist/firefox-v$version.xpi
    ;;
esac
