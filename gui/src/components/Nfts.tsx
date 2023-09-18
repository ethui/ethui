import { Card, CardContent, CardMedia, Grid } from "@mui/material";
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

  const nfts = useNfts((s) => s.nfts);

  return (
    <Panel>
      <Grid container spacing={1}>
        {nfts.map((nft) => {
          const imgSrc = nft.metadata ? JSON.parse(nft.metadata).image : undefined;
          return (
            <NftGalleryItem
              key={`${nft.contract}-${ nft.token_id}`}
              contract={nft.contract}
              clickHandler={() => {
                setCurrentNftDetails(nft);
              }}
              imgSrc={imgSrc} //nft?.imgSrc}
            />
          );
        })}
      </Grid>

      <Modal
        sx={{width: '80%'}}
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
      <Grid item
        onClick={() => {
          clickHandler();
          setDetailsViewOpen(true);
        }}
      >
        <Card>
        <CardMedia
          component="img"
          image={`${imgSrc ?? ''}`}
          alt="Nft image" />
          <CardContent>
            <AddressView address={contract} />
          </CardContent>
        </Card>
      </Grid>
    );
  }
}
