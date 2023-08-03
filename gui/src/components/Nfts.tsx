import {
  Box,
  CircularProgress,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import React, { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";

import { useNetworks, useWallets } from "../store";
import { useErc721 } from "../store/erc721";
import { Address, NftToken, Paginated, Pagination } from "../types";
import { Modal, NftDetailsView } from "./";
import { AddressView } from "./AddressView";
import { Panel } from "./Panel";

interface NftGalleryItemProps {
  contract: Address;
  imgSrc: string | undefined;
  clickHandler: () => void;
}

export function Nfts() {
  const account = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);

  const [detailsViewOpen, setDetailsViewOpen] = useState(false);
  const [currentNftDetails, setCurrentNftDetails] = useState<
    NftToken | undefined
  >(undefined);

  const nftsList = useErc721((s) => s.erc721Tokens);

  return (
    <Panel>
      <ImageList cols={3} gap={10}>
        {nftsList.map((nft) => {
          return (
            <NftGalleryItem
              key={nft.hash}
              contract={nft.hash}
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
        {currentNftDetails && <NftDetailsView nftData={currentNftDetails} />}
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
