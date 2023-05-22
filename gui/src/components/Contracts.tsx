import { List, ListItem, Typography } from "@mui/material";
import React from "react";

import { useInvoke } from "../hooks/tauri";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { Address } from "../types";
import { ContextMenu } from "./ContextMenu";
import Panel from "./Panel";

export function Contracts() {
  const { data: addresses, mutate } = useInvoke<Address[]>("db_get_contracts");

  useRefreshTransactions(mutate);

  return (
    <Panel>
      <List>
        {(addresses || []).map((address) => (
          <Contract key={address} address={address} />
        ))}
      </List>
    </Panel>
  );
}

function Contract({ address }: { address: Address }) {
  return (
    <ListItem>
      <ContextMenu>
        <Typography sx={{ textTransform: "none" }}>{address}</Typography>
      </ContextMenu>
    </ListItem>
  );
}
