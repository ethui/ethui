import { List, ListItem, ListItemText } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import React from "react";
import { useEffect } from "react";

import { useInvoke } from "../hooks/tauri";
import { Address } from "../types";
import Panel from "./Panel";

export function Contracts() {
  const { data: addresses, mutate } = useInvoke<Address[]>("get_contracts");

  useEffect(() => {
    const unlisten = listen("refresh-transactions", () => {
      mutate();
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [mutate]);

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
