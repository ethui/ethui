import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
} from "@mui/material";

import { useInvoke, useRefreshTransactions } from "../hooks";
import { useNetworks } from "../store";
import { ABIMatch, Address } from "../types";
import { ABIForm, AddressView, Panel } from "./";

interface IContract {
  address: Address;
  deployedCodeHash: string;
}

export function Contracts() {
  const chainId = useNetworks((s) => s.current?.chain_id);
  const { data: contracts, mutate } = useInvoke<IContract[]>(
    "db_get_contracts",
    { chainId }
  );

  useRefreshTransactions(mutate);

  return (
    <Panel>
      {(contracts || []).map((contract) => (
        <Contract key={contract.address} {...contract} />
      ))}
    </Panel>
  );
}

function Contract({ address, deployedCodeHash }: IContract) {
  console.log(address, deployedCodeHash);
  const { data } = useInvoke<ABIMatch>("foundry_get_abi", {
    deployedCodeHash,
  });

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <AddressView address={address} />
        {data && <Chip sx={{ marginLeft: 2 }} label={data.name} />}
      </AccordionSummary>
      <AccordionDetails>
        {data && <ABIForm address={address} abi={data.abi} />}
      </AccordionDetails>
    </Accordion>
  );
}
