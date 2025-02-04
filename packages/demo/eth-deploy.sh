#!/usr/bin/env bash

export MNEMONIC="test test test test test test test test test test test junk"
export SENDER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

forge soldeer update

forge build
sleep 0.2 && forge script script/DevDeploy.s.sol --rpc-url http://localhost:8545 --broadcast --mnemonics "$MNEMONIC" --sender "$SENDER" --slow
yarn run wagmi generate
