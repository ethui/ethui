#!/usr/bin/env bash

set -ue

watchexec \
  --watch contracts \
  --watch foundry.toml \
  --restart \
  --exts sol,toml ./eth-deploy.sh
