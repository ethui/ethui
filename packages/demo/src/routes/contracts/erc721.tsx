import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute } from "@tanstack/react-router";
import { map } from "lodash-es";
import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useReadsNftTokenUri } from "#/wagmi.extra";
import { useWriteNftMint } from "#/wagmi.generated";
import {
  useReadNftListTokensByAddress,
  useWatchNftTransferEvent,
} from "#/wagmi.generated";

export const Route = createFileRoute("/contracts/erc721")({
  beforeLoad: () => ({ breadcrumb: "ERC721" }),
  component: ERC721,
});

function ERC721() {
  return (
    <>
      <Mint />
      <Owned />
    </>
  );
}

function Mint() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteNftMint();

  const onClick = async () => {
    if (!address) return;
    writeContract({ args: [address] });
  };

  return (
    <>
      <div className="flex gap-2">
        <Button disabled={!address || isPending} onClick={onClick}>
          {isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
          Mint Pokemon
        </Button>
      </div>
    </>
  );
}

function Owned() {
  const { address } = useAccount();
  const { data: owned, refetch } = useReadNftListTokensByAddress({
    args: [address ?? "0x0"],
  });
  const { data: uris } = useReadsNftTokenUri(
    map(owned).map((id) => ({
      args: [id],
      enabled: !!owned,
    })),
  );

  const [metadatas, setMetadatas] = useState<Metadata[]>([]);

  useEffect(() => {
    if (!uris) return;
    if (uris[0]?.error) return;

    const metadatas = (uris as Array<{ result: string }>).map(({ result }) =>
      decodeMetadata(result),
    );
    setMetadatas(metadatas);
  }, [uris]);

  useWatchNftTransferEvent({
    pollingInterval: 100,
    onLogs: () => {
      refetch().catch(console.error);
    },
  });
  return (
    <div className="flex flex-wrap gap-2">
      {metadatas?.map(({ name, image }) => (
        <img key={image} alt={name} src={image} srcSet={image} width={50} />
      ))}
    </div>
  );
}

export interface Metadata {
  name: string;
  image: string;
}

export function decodeMetadata(encoded: string): Metadata {
  return (
    encoded &&
    JSON.parse(
      window.atob(encoded.replace("data:application/json;base64,", "")),
    )
  );
}
