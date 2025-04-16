#!/bin/bash

if [[ "$(uname)" != "Darwin" ]]; then
  exit 0;
fi

RELEASE_PATH="target/universal-apple-darwin/release/ethui"

install_name_tool -change "/opt/homebrew/opt/libusb/lib/libusb-1.0.0.dylib" "@rpath/libusb-1.0.dylib" "$RELEASE_PATH"
