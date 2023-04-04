alias d := dev
alias l := lint

setup:
  yarn
  cargo build

dev:
  rm -rf target/debug/db.*
  yarn run tauri dev

lint:
  cargo clippy
  yarn eslint .

#
# internal
#

extension-dev:
  yarn run parcel watch extension/manifest.json --no-cache --host localhost

anvil:
  anvil --block-time 4

send-eth:
  cast send \
    0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc \
    "" \
    --value 100000000000000000 \
    --from 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    --rpc-url http://localhost:8545

