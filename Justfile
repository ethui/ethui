alias d := dev
alias l := lint

setup:
  yarn
  cargo build

dev:
  RUST_LOG=iron=debug yarn run tauri dev

lint:
  cargo clippy
  yarn eslint .

#
# internal
#

extension-dev:
  yarn run parcel watch extension/manifest.json --no-cache --host localhost
