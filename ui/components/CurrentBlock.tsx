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
    if (block === 0) {
      update();
    } else {
      const interval = setInterval(update, 5000);

      return () => clearInterval(interval);
    }
  }, [block]);

  return (
    <div>
      <p>Block: {block.toString()}</p>
    </div>
  );
}
