#!/bin/sh

patch() {
  type=$1
  manifest=$2

  if [[ $type == firefox ]]; then
    # change background.service_worker into background.scripts
    jq ".background={scripts: [.background.service_worker]}" -c $manifest > $manifest.tmp
    mv $manifest.tmp $manifest
  fi
}

release() {
  type=$1
  # tag comes 1st from CLI arg,
  # with fallback to $EXTENSION_TAG env variable,
  # with fallback to "untagged"
  tag=${2:-${EXTENSION_TAG:-untagged}}
  dist=dist-${type}

  mkdir -p $dist

  parcel build manifest.json --no-source-maps --dist-dir $dist
  patch $type $dist/manifest.json
  zip -r extension-${tag}-${type}.zip $dist
  rm -rf $manifest $dist
}

release "chrome" $@
release "firefox" $@
