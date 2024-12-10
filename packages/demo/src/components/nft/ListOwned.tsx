import { useReadsNftTokenUri } from "@/wagmi.extra";
import {
  useReadNftListTokensByAddress,
  useWatchNftTransferEvent,
} from "@/wagmi.generated";
import { Grid } from "@mui/material";
import { map } from "lodash-es";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export function ListOwned() {
  const { address } = useAccount();

  const { data: nftsList, refetch } = useReadNftListTokensByAddress({
    args: [address ?? "0x0"],
  });

  const { data: uris } = useReadsNftTokenUri(
    map(nftsList).map((id) => ({
      args: [id],
      enabled: !!nftsList,
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
    onLogs: () => {
      refetch().catch(console.error);
    },
  });

  return (
    <Grid container>
      {metadatas?.map(({ image }) => (
        <Grid item key={image}>
          <img src={image} srcSet={image} width={50} />
        </Grid>
      ))}
    </Grid>
  );
}

export interface Metadata {
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
