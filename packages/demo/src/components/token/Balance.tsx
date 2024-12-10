import {
  useReadTokenBalanceOf,
  useWatchTokenTransferEvent,
} from "@/wagmi.generated";
import { Typography } from "@mui/material";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

export function Balance() {
  const { address } = useAccount();
  const { data: balance, refetch } = useReadTokenBalanceOf({
    args: address && [address ?? "0x0"],
  });

  useWatchTokenTransferEvent({
    onLogs: () => {
      refetch().catch(console.error);
    },
  });

  if (!balance) return null;

  return <Typography>Balances: {formatEther(balance)}</Typography>;
}
