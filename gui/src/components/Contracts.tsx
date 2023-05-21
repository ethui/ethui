import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  List,
  Typography,
} from "@mui/material";

import { useInvoke } from "../hooks/tauri";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { Address } from "../types";
import { ABIForm } from "./ABIForm";
import Panel from "./Panel";

interface IContract {
  address: Address;
  deployedCodeHash: string;
}

export function Contracts() {
  const { data: contracts, mutate } =
    useInvoke<IContract[]>("db_get_contracts");

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
  const { data: abi } = useInvoke<string>("foundry_get_abi", {
    deployedCodeHash,
  });

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography>{address}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {abi && <ABIForm address={address} abi={abi} />}
      </AccordionDetails>
    </Accordion>
  );
}
