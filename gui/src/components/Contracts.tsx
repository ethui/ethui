import { List, ListItem, ListItemText } from "@mui/material";
import React from "react";

import { useInvoke } from "../hooks/tauri";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { Address } from "../types";
import Panel from "./Panel";

export function Contracts() {
  const { data: addresses, mutate } = useInvoke<Address[]>("get_contracts");

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
      <ListItemText primary={address} />
    </ListItem>
  );
}
