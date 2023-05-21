import { Typography } from "@mui/material";

interface Props {
  address: Address;
  abi: unknown;
}

export function ABIForm({ address, abi }: Props) {
  return (
    <>
      <Typography>{JSON.stringify(abi)}</Typography>
    </>
  );
}
