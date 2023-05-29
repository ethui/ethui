import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Typography,
} from "@mui/material";

import { useInvoke } from "../hooks/tauri";
import { useRefreshTransactions } from "../hooks/useRefreshTransactions";
import { ABIMatch, Address } from "../types";
import { ABIForm } from "./ABIForm";
import { AddressView } from "./AddressView";
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
  const { data } = useInvoke<ABIMatch>("foundry_get_abi", {
    deployedCodeHash,
  });

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography sx={{ textTransform: "none" }}>
          <AddressView address={address} />
          {data && <Chip sx={{ marginLeft: 2 }} label={data.name} />}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {data && <ABIForm address={address} abi={data.abi} />}
      </AccordionDetails>
    </Accordion>
  );
}
