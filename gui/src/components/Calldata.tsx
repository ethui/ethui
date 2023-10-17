import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Tab } from "@mui/material";
import { Abi, Address } from "abitype";
import { useState } from "react";
import JsonView from "react18-json-view";
import { decodeFunctionData } from "viem";

import { useApi } from "@/hooks";

import { MonoText } from "./MonoText";

interface Props {
  contract?: Address;
  chainId?: number;
  data: `0x${string}`;
}

export function CalldataView({ data, contract, chainId }: Props) {
  const [tab, setTab] = useState("1");

  const handleTabChange = (_e: React.SyntheticEvent, newTab: string) => {
    setTab(newTab);
  };

  const { data: abi } = useApi<Abi>("abi", {
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
    <TabContext value={tab}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <TabList onChange={handleTabChange} aria-label="lab API tabs example">
          <Tab label="Hex" value="1" />
          {decoded && <Tab label="Json" value="2" />}
        </TabList>
      </Box>
      <TabPanel value="1">
        <MonoText>{data}</MonoText>
      </TabPanel>
      {decoded && (
        <TabPanel value="2">
          <JsonView src={decoded} theme="default" />
        </TabPanel>
      )}
    </TabContext>
  );
}
