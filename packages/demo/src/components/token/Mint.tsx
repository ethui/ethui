import { useWriteTokenMint } from "@/wagmi.generated";
import { Button } from "@mui/material";
import { useAccount } from "wagmi";

export function Mint() {
  const { address } = useAccount();
  const { isPending, writeContract } = useWriteTokenMint();

  if (!address) return null;

  return (
    <Button
      variant="contained"
      disabled={isPending}
      onClick={() => {
        writeContract({
          functionName: "mint", // https://github.com/wevm/wagmi/issues/3613
          args: [address, BigInt(1e18)],
        });
      }}
    >
      {isPending ? "Minting..." : "Mint $TEST"}
    </Button>
  );
}
