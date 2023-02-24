import { BigNumber } from "ethers";
import { useEffect, useState } from "react";
import { requestToBackground } from "../messenger";
import { IronProvider } from "../provider";

const provider = new IronProvider(
  async (req) =>
    (await requestToBackground({ type: "eth", message: req })).result
);

export function CurrentBlock() {
  const [block, setBlock] = useState(BigNumber.from(0));

  const update = async () => {
    const resp = await provider.request({ method: "eth_blockNumber" });
    setBlock(BigNumber.from(resp));
  };

  // update block number every few seconds
  useEffect(() => {
    if (block.eq(0)) {
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
