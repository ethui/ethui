import { DocumentDuplicateIcon } from "@heroicons/react/20/solid";
import { writeText } from "@tauri-apps/api/clipboard";
import React from "react";
import truncateEthAddress from "truncate-eth-address";

import { useAccount } from "../hooks";
import Button from "./Base/Button";
import Panel from "./Base/Panel";

export function Details() {
  const address = useAccount();

  if (!address) return null;

  return (
    <Panel>
      <Button onClick={() => writeText(address)}>
        <div className="flex items-center">
          <span>{truncateEthAddress(address)}</span>
          <DocumentDuplicateIcon className="w-4 h-4 ml-2" />
        </div>
      </Button>
    </Panel>
  );
}
