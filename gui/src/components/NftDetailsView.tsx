import { List, ListItem, ListItemText } from "@mui/material";

import { NftToken } from "../types";
import { AddressView } from "./AddressView";

export function NftDetailsView({ nftData }: { nftData: NftToken }) {
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
            primary={"Chain ID"}
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
