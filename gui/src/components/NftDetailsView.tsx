import { List, ListItem, ListItemText, Typography } from "@mui/material";

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
            primary={<Typography variant="body2" color="text.primary">
            Collection
            </Typography>}
          secondary={<Typography variant="body2" color="text.secondary">
            {nft.name} ({nft.symbol})
            </Typography>}
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
            secondary={nft.metadata}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={"Asset URL"}
            secondary={JSON.parse(nft.metadata).image}
          />
        </ListItem>
      </List>
    </div>
  );
}
