import { ImageList, ImageListItem, ImageListItemBar } from "@mui/material";
import { useState } from "react";

import { useNfts } from "../store/nfts";
import { Address, Nft } from "../types";
import { Modal, NftDetailsView } from "./";
import { AddressView } from "./AddressView";
import { Panel } from "./Panel";

interface NftGalleryItemProps {
  contract: Address;
  imgSrc: string | undefined;
  clickHandler: () => void;
}

export function Nfts() {
  const [detailsViewOpen, setDetailsViewOpen] = useState(false);
  const [currentNftDetails, setCurrentNftDetails] = useState<
    Nft | undefined
  >(undefined);

  const nftsList = useNfts((s) => s.nfts);

  return (
    <Panel>
      <ImageList cols={3} gap={10}>
        {nftsList.map((nft) => {
          return (
            <NftGalleryItem
              key={`${nft.contract}-${ nft.token_id}`}
              contract={nft.contract}
              clickHandler={() => {
                setCurrentNftDetails(nft);
              }}
              imgSrc={undefined} //nft?.imgSrc}
            />
          );
        })}
      </ImageList>

      <Modal
        open={detailsViewOpen}
        onClose={() => {
          setCurrentNftDetails(undefined);
          setDetailsViewOpen(false);
        }}
      >
        {currentNftDetails && <NftDetailsView nft={currentNftDetails} />}
      </Modal>
    </Panel>
  );

  function NftGalleryItem({
    contract,
    imgSrc,
    clickHandler,
  }: NftGalleryItemProps) {
    return (
      <ImageListItem
        sx={{ cursor: "pointer" }}
        onClick={() => {
          clickHandler();
          setDetailsViewOpen(true);
        }}
      >
        <img
          src={`${
            imgSrc ?? "https://placehold.co/150x150"
          }?w=164&h=164&fit=crop&auto=format`}
          srcSet={`${
            imgSrc ?? "https://placehold.co/150x150"
          }?w=164&h=164&fit=crop&auto=format&dpr=2 2x`}
          alt={contract.slice(0, 1)}
          loading="lazy"
        />
        <ImageListItemBar
          title={<AddressView address={contract} />}
          position="bottom"
        />
      </ImageListItem>
    );
  }
}
