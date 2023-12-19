import { Chip, Stack } from "@mui/material";
import { Abi, Address } from "abitype";
import { useState } from "react";
import JsonView from "react18-json-view";
import { decodeFunctionData } from "viem";

import { Typography } from "@iron/react/components";
import { useInvoke } from "@/hooks";

interface Props {
  contract?: Address;
  chainId?: number;
  data: `0x${string}`;
}

export function CalldataView({ data, contract, chainId }: Props) {
  const [tab, setTab] = useState("hex");

  const { data: abi } = useInvoke<Abi>("get_contract_abi", {
    address: contract,
    chainId,
  });

  let decoded;
  if (abi) {
    decoded = decodeFunctionData({
      abi: abi || [],
      data,
    });
  }

  return (
    <>
      <Stack direction="row" spacing={1}>
        <TabChip label="Hex" value="hex" onClick={setTab} current={tab} />
        {decoded && (
          <TabChip label="Json" value="json" onClick={setTab} current={tab} />
        )}
      </Stack>
      {tab == "hex" && <Typography mono>{data}</Typography>}
      {tab == "json" && <JsonView src={decoded} theme="default" />}
    </>
  );
}

interface TabChipProps {
  label: string;
  value: string;
  current: string;
  onClick: (value: string) => void;
}

function TabChip({ label, value, onClick, current }: TabChipProps) {
  return (
    <Chip
      label={label}
      size="small"
      onClick={() => onClick(value)}
      variant={current == value ? "filled" : "outlined"}
    />
  );
}
