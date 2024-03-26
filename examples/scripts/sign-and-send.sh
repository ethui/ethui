#!/bin/bash

curl \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "to": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    "data": "0x6a627842000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "gasLimit": 669107
}' \
  http://localhost:9103/ethui/transactions/sign-and-send | jq
