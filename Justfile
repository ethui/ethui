alias d := dev

dev:
  watchexec --exts ts,tsx,json,html,cjs --restart --print-events --no-project-ignore --ignore "{node_modules,.git,.parcel-cache,dist}/*" -- yarn build
