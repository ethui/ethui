import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute } from "@tanstack/react-router";
import { Check, LoaderCircle } from "lucide-react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  useReadTokenBalanceOf,
  useWatchTokenTransferEvent,
  useWriteTokenMint,
} from "#/wagmi.generated";

export const Route = createFileRoute("/contracts/erc20")({
  beforeLoad: () => ({ breadcrumb: "ERC20" }),
  component: ERC20,
});

function ERC20() {
  return (
    <>
      <Mint />
      <Balance />
    </>
  );
}

function Mint() {
  const { address } = useAccount();
  const { isPending, writeContract } = useWriteTokenMint();

  const onClick = async () => {
    if (!address) return;
    writeContract({ args: [address, BigInt(1e18)] });
  };

  return (
    <div className="flex gap-2">
      <Button disabled={!address || isPending} onClick={onClick}>
        {isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
        Mint $TEST
      </Button>
    </div>
  );
}

function Balance() {
  const { address } = useAccount();
  const { data: balance, refetch } = useReadTokenBalanceOf({
    args: address && [address ?? "0x0"],
  });

  useWatchTokenTransferEvent({
    pollingInterval: 100,
    onLogs: () => {
      refetch().catch(console.error);
    },
  });

  if (!balance) return null;

  return <p>Balances: {formatEther(balance)}</p>;
}
