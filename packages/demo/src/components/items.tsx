"use client";

import { Stack } from "@mui/material";

import * as Nft from "@/components/nft";
import * as ERC20 from "@/components/token";

export default function Items() {
  return (
    <Stack direction="column" spacing={1}>
      <div>
        <h1>Mint NFT</h1>
        <Nft.Mint />
        <Nft.ListOwned />
      </div>
      <hr />
      <div>
        <h1>Mint TEST</h1>
        <ERC20.Mint />
        <ERC20.Balance />
      </div>
      <hr />
    </Stack>
  );
}
