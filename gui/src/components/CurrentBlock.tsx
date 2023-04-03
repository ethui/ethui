import { useEffect, useState } from "react";

import { useClient } from "../hooks";

export function CurrentBlock() {
  const client = useClient();
  const [block, setBlock] = useState<bigint>(0n);

  // update block number every few seconds
  useEffect(() => {
    const update = async () => {
      if (!client) return;

      const block = await client.getBlockNumber();
      setBlock(block);
    };

    update();
    const interval = setInterval(update, 2000);

    return () => clearInterval(interval);
  }, [client, block]);

  return <p>Block: {block.toString()}</p>;
}
