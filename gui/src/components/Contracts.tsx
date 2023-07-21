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

interface ContractData {
  address: Address;
  deployedCodeHash: string;
}

export function Contracts() {
  const chainId = useNetworks((s) => s.current?.chain_id);
  const { data: contracts, mutate } = useInvoke<ContractData[]>(
    "db_get_contracts",
    { chainId }
  );

  useRefreshTransactions(mutate);

  if (!chainId) return null;

  return (
    <Panel>
      {(contracts || []).map(({ address }) => (
        <Contract key={address} address={address} chainId={chainId} />
      ))}
    </Panel>
  );
}

interface IContract {
  address: Address;
  chainId: number;
}

function Contract({ address, chainId }: IContract) {
  const { data } = useInvoke<ABIMatch>("foundry_get_abi", {
    address,
    chainId,
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
