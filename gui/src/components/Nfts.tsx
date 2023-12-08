import { ImageList, ImageListItem, ImageListItemBar } from "@mui/material";

import { Nft } from "@/types";
import { useNfts } from "@/store/nfts";

export function Nfts() {
  const nfts = useNfts((s) => s.nfts);

  return (
    <ImageList
      sx={{ width: 500, height: 450 }}
      variant="masonry"
      cols={3}
      gap={5}
    >
      {nfts.map((nft) => (
        <Item key={`${nft.contract}/${nft.token_id}`} {...nft} />
      ))}
    </ImageList>
  );
}

type ItemProps = Nft;

function Item({ contract, token_id, metadata }: ItemProps) {
  const imgSrc = metadata && JSON.parse(metadata).image;
  const title = metadata
    ? JSON.parse(metadata).name
    : `${contract} - ${token_id}`;

  return (
    <ImageListItem>
      <img
        srcSet={`${imgSrc}?w=161&fit=crop&auto=format&dpr=2 2x`}
        src={`${imgSrc}?w=161&fit=crop&auto=format`}
        alt={title}
        loading="lazy"
      />
      <ImageListItemBar title={title} position="top" actionPosition="left" />
    </ImageListItem>
  );
}
