import React, { useEffect, useRef, useState } from "react";
import { useProvider } from "@iron/ui/hooks";

export function CurrentBlock() {
  const provider = useProvider();
  const [block, setBlock] = useState(0);
  const previousBlock = useRef(0);

  useEffect(() => {
    previousBlock.current = block;

    const update = async () => {
      const block = await provider.getBlockNumber();
      setBlock(block);
    };

    update();

    const interval = setInterval(update, 2000);

    return () => clearInterval(interval);
  }, [provider, block]);

  return (
    <>
      <p>Previous block: {previousBlock.current}</p>
      <p>Current block: {block}</p>
      <p>
        Local network status:{" "}
        {block !== 0 && block !== previousBlock.current
          ? "restarted"
          : "running"}
      </p>
    </>
  );
}
