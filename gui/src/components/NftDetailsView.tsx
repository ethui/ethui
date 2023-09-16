import { List, ListItem, ListItemText } from "@mui/material";

import { Nft } from "../types";
import { AddressView } from "./AddressView";

export function NftDetailsView({ nft }: { nft: Nft }) {
  return (
    <div>
      <List dense={true}>
        <ListItem>
          <ListItemText
            primary={"Contract Address"}
            secondary={<AddressView address={nft.contract} />}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={"Token ID"}
            secondary={<AddressView address={nft.token_id} />}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={"Metadata"}
            secondary={<p>{JSON.stringify(nft.metadata)}</p>}
          />
        </ListItem>
        <ListItem>
          <ListItemText primary={"Metadata"} secondary={"{}"} />
        </ListItem>
      </List>
    </div>
  );
}
