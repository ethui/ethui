alias d := dev

dev:
  #!/bin/bash -ue
  trap 'kill %1; kill %2' SIGINT
  just extension-watch | sed -e 's/^/\x1b[0;31m[extension]\x1b[0m /' &
  just mock-server 2>&1 | sed -e 's/^/\x1b[0;32m[miniserve]\x1b[0m /' &
  wait

extension-watch:
  watchexec --restart --exts .ts,.tsx --ignore .next yarn dev

mock-server:
  miniserve .
