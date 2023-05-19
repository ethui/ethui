import { List, ListItem, Typography } from "@mui/material";

import { useInvoke } from "../hooks/tauri";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { Address } from "../types";
import { CopyToClipboard } from "./CopyToClipboard";
import Panel from "./Panel";

interface IContract {
  address: Address;
  deployedCodeHash: string;
}

export function Contracts() {
  const { data: contracts, mutate } = useInvoke<IContract[]>("get_contracts");

  useRefreshTransactions(mutate);

  return (
    <Panel>
      <List>
        {(contracts || []).map((contract) => (
          <Contract key={contract.address} {...contract} />
        ))}
      </List>
    </Panel>
  );
}

function Contract({ address, deployedCodeHash }: IContract) {
  console.log(deployedCodeHash);
  const { data: abi, ...rest } = useInvoke<string>("foundry_get_abi", {
    deployedCodeHash,
  });

  console.log(abi);
  console.log(rest);

  return (
    <ListItem>
      <CopyToClipboard>
        <Typography>{address}</Typography>
      </CopyToClipboard>
    </ListItem>
  );
}
