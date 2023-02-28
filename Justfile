alias d := dev

dev:
  #!/bin/bash -ue
  trap 'kill %1; kill %2' SIGINT
  just extension-watch | sed -e 's/^/\x1b[0;31m[extension]\x1b[0m /' &
  just mock-server 2>&1 | sed -e 's/^/\x1b[0;32m[miniserve]\x1b[0m /' &
  wait

extension-watch:
  watchexec --exts ts,tsx,json,html,cjs --restart --print-events --no-project-ignore --ignore "{node_modules,.git,.parcel-cache,dist}/*" -- yarn build

mock-server:
  miniserve .
