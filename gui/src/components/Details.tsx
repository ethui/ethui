import ContentCopy from "@mui/icons-material/ContentCopy";
import { Button, Tooltip } from "@mui/material";
import { writeText } from "@tauri-apps/api/clipboard";
import React, { useState } from "react";
import truncateEthAddress from "truncate-eth-address";

import { useAccount } from "../hooks";
import { Balances } from "./Balances";
import Panel from "./Panel";

export function Details() {
  const [copied, setCopied] = useState(false);
  const address = useAccount();

  if (!address) return null;

  const copyToClipboard = () => {
    writeText(address);
    setCopied(true);
  };

  return (
    <Panel>
      <Tooltip
        onClose={() => setTimeout(() => setCopied(false), 500)}
        title={copied ? "Copied to clipboard" : "Copy to clipboard"}
      >
        <Button
          variant="outlined"
          endIcon={<ContentCopy />}
          onClick={copyToClipboard}
        >
          {truncateEthAddress(address)}
        </Button>
      </Tooltip>
      <Balances />
    </Panel>
  );
}
