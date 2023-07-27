import {
  Box,
  CircularProgress,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import React, { useState } from "react";
import InfiniteScroll from "react-infinite-scroller";

import { useNetworks, useWallets } from "../store";
import { Address, Nft, Paginated, Pagination } from "../types";
import { Modal, NftDetailsView } from "./";
import { AddressView } from "./AddressView";
import { Panel } from "./Panel";

export function Nfts() {
  const account = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);

  const [detailsViewOpen, setDetailsViewOpen] = useState(false);
  const [currentNftDetails, setCurrentNftDetails] = useState<Nft | undefined>(
    undefined
  );
  const [pages, setPages] = useState<Paginated<Nft>[]>([]);

  const loadMore = () => {
    let pagination: Pagination = {};
    const last = pages?.at(-1)?.pagination;
    if (!!last) {
      pagination = last;
      pagination.page = (pagination.page || 0) + 1;
    }

    invoke<Paginated<Nft>>("db_get_transactions", {
      address: account,
      chainId,
      pagination,
    }).then((page) => setPages([...pages, page]));
  };

  const loader = (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
      }}
      key="loader"
    >
      <CircularProgress />
    </Box>
  );

  const reload = () => {
    setPages([]);
  };

  return (
    <Panel>
      <InfiniteScroll
        loadMore={loadMore}
        hasMore={!pages.at(-1)?.last}
        loader={loader}
      >
        <ImageList cols={3} gap={10}>
          {pages.flatMap((page) =>
            page.items.map((nft) => {
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
            })
          )}
        </ImageList>
      </InfiniteScroll>
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
  }: {
    contract: Address;
    imgSrc: string | undefined;
    clickHandler: () => void;
  }) {
    return (
      <ImageListItem
        onClick={() => {
          clickHandler();
          setDetailsViewOpen(true);
        }}
      >
        <img
          src={`${imgSrc ?? ""}?w=164&h=164&fit=crop&auto=format`}
          srcSet={`${imgSrc ?? ""}?w=164&h=164&fit=crop&auto=format&dpr=2 2x`}
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
