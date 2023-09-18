import { Card, CardContent, CardMedia, Grid, Typography } from "@mui/material";
import { useState } from "react";

import { useNfts } from "../store/nfts";
import { Address, Nft } from "../types";
import { Modal, NftDetailsView } from "./";
import { AddressView } from "./AddressView";
import { Panel } from "./Panel";
import { flare } from "viem/chains";

interface ItemProps {
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
            <Item
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

  function Item({
    contract,
    imgSrc,
    clickHandler,
  }: ItemProps) {
    return (
      <Grid item>
        <Card onClick={() => {
          clickHandler();
          setDetailsViewOpen(true);
        }}>
        <CardMedia
          component="img"
          image={`${imgSrc ?? ''}`}
          alt="Nft image" />
          <CardContent  sx={{ display: 'flex', width: '100%', justifyContent: 'center'}}>
          <Typography variant={"body1"}>
              <AddressView address={contract} />
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
  }
}
