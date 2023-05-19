import ContentCopy from "@mui/icons-material/ContentCopy";
import { Button, Tooltip } from "@mui/material";
import { writeText } from "@tauri-apps/api/clipboard";
import React, { useState } from "react";
import truncateEthAddress from "truncate-eth-address";

import { useAccount } from "../hooks";
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
      <Button
        sx={{ textTransform: "none" }}
        variant="outlined"
        endIcon={<ContentCopy />}
        onClick={copyToClipboard}
      >
<<<<<<< Updated upstream
        <Button
          variant="outlined"
          endIcon={<ContentCopy />}
          onClick={copyToClipboard}
        >
          {truncateEthAddress(address)}
        </Button>
      </Tooltip>
||||||| Stash base
        <Button
          variant="outlined"
          endIcon={<ContentCopy />}
          onClick={copyToClipboard}
        >
          {truncateEthAddress(address)}
        </Button>
      </Tooltip>
      <Balances />
=======
        {truncateEthAddress(address)}
      </Button>
      <Balances />
>>>>>>> Stashed changes
    </Panel>
  );
}
