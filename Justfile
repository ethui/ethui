alias d := dev

dev:
  #!/bin/bash -ue
  trap 'kill %1; kill %2' SIGINT
  just extension-dev | sed -e 's/^/\x1b[0;31m[extension]\x1b[0m /' &
  just tauri-dev

extension-dev:
  parcel watch extension/manifest.json --no-cache --host localhost

tauri-dev:
  RUST_LOG=iron=debug tauri dev
