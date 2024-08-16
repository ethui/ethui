import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Box } from "@mui/material";

import { useWallets } from "@/store";
import { AddressView, BalancesList, CopyToClipboard } from "@/components";
import { Navbar } from "@/components/Home/Navbar";

export const Route = createFileRoute("/_home/home/account")({
  component: Account,
});

export function Account() {
  const address = useWallets((s) => s.address);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  const formattedValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(totalPrice / 10 ** 6));

  if (!address) return null;

  return (
    <>
      <Navbar>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <AddressView variant="h6" address={address} />
          <CopyToClipboard label={totalPrice.toString()} sx={{ ml: 8 }}>
            {formattedValue}
          </CopyToClipboard>
        </Box>
      </Navbar>
      <BalancesList onTotalPriceChange={setTotalPrice} />
    </>
  );
}
