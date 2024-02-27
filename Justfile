set positional-arguments

alias d := dev
alias f := fix
alias l := lint

dev *args='':
  cargo tauri dev --config bin/iron/tauri-dev.conf.json --features ${IRON_FEATURES:-debug} -- -- -- $@

setup:
  yarn
  cargo build

build:
  yarn extension:build
  cargo build

fix:
  cargo +nightly fmt --all
  cargo clippy --all --fix --allow-dirty
  yarn fix

lint:
  cargo +nightly fmt --all -- --check
  cargo clippy --all -- -D clippy::all -D clippy::dbg_macro
  yarn lint

ext:
  yarn run ext:build

ext-dev:
  yarn run ext:dev

clean:
  rm -rf \
    target \
    node_modules \
    gui/node_modules \
    extension/node_modules \
    gui/dist \
    extension/dist

# builds a zip from which the browser extension build process can be run
# needs to be submitted to the Mozilla store for every new extension update
ext-source:
  #!/bin/bash
  local=$PWD
  dir=$(mktemp --directory --suffix=iron)
  shopt -s extglob
  rsync -r . $dir --exclude '.git' --exclude target --exclude node_modules --exclude '.github' --exclude bin --exclude crates --exclude .envrc --exclude examples --exclude migrations --exclude '*.zip'
  cd $dir && zip -r $local/ext-source.zip . > /dev/null
  rm -rf $dir
  echo "Source zipped to $local/ext-source.zip"

#
# internal
#

anvil:
  anvil --block-time 4

send-eth:
  cast send \
    0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc \
    "" \
    --value 100000000000000000 \
    --from 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    --rpc-url http://localhost:8545

