import { useWriteNftMint } from "@/wagmi.generated";
import { Button } from "@mui/material";
import { useAccount } from "wagmi";

export function Mint() {
  const { address } = useAccount();
  const { writeContract, isPending, ...args } = useWriteNftMint();
  console.log(args);
  console.log(address);

  if (!address) return null;

  return (
    <Button
      variant="contained"
      disabled={isPending}
      onClick={() => {
        console.log(address);
        writeContract({
          functionName: "mint", // https://github.com/wevm/wagmi/issues/3613
          args: [address],
        });
      }}
    >
      {isPending ? "Minting..." : "Mint NFT"}
    </Button>
  );
}
