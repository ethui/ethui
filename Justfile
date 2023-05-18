alias d := dev
alias l := lint

setup:
  yarn
  cargo build

build:
  yarn extension:build
  cargo build

dev:
  rm -rf target/debug/db.*
  yarn run tauri dev --features ${IRON_FEATURES:-debug}

lint:
  cargo fmt --all -- --check
  cargo clippy
  yarn lint

ext:
  yarn run extension:build

ext-dev:
  yarn run extension:dev

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

