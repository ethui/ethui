import { useEffect, useState } from "react";
import { useProvider } from "../hooks";

export function CurrentBlock() {
  const provider = useProvider();
  const [block, setBlock] = useState(0);

  // update block number every few seconds
  useEffect(() => {
    const update = async () => {
      const block = await provider.getBlockNumber();
      setBlock(block);
    };

    update();
    const interval = setInterval(update, 2000);

    return () => clearInterval(interval);
  }, [provider, block]);

  return <p>Block: {block.toString()}</p>;
}
