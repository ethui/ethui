alias d := dev
alias f := fix
alias l := lint

setup:
  yarn
  cargo build

build:
  yarn extension:build
  cargo build

dev:
  yarn run tauri dev --features ${IRON_FEATURES:-debug}

fix:
  cargo +nightly fmt --all
  cargo clippy --all --fix
  yarn fix

lint:
  cargo +nightly fmt --all -- --check
  cargo clippy --all -- -D clippy::all -D clippy::dbg_macro
  yarn lint

ext:
  yarn run ext:build

ext-dev:
  yarn run ext:dev

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

