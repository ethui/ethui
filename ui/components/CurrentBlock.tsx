import React from "react";
import { useEffect, useState } from "react";
import { useProvider } from "../hooks";

export function CurrentBlock() {
  const provider = useProvider();
  const [block, setBlock] = useState(0);

  const update = async () => {
    const block = await provider.getBlockNumber();
    setBlock(block);
  };

  // update block number every few seconds
  useEffect(() => {
    update();
    const interval = setInterval(update, 2000);

    return () => clearInterval(interval);
  }, [provider, block]);

  return <p>Block: {block.toString()}</p>;
}
