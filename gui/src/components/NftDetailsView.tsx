import { List, ListItem, ListItemText } from "@mui/material";

import { Nft } from "../types";
import { AddressView } from "./AddressView";

export function NftDetailsView({ nftData }: { nftData: Nft }) {
  return (
    <div>
      <List dense={true}>
        <ListItem>
          <ListItemText
            primary={"Contract Address"}
            secondary={<AddressView address={nftData.hash} />}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={"Owner"}
            secondary={<AddressView address={nftData.hash} />}
          />
        </ListItem>
        <ListItem>
          <ListItemText primary={"Metadata"} secondary={"{}"} />
        </ListItem>
      </List>
    </div>
  );
}
