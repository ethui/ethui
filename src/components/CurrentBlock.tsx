import { useState } from "react";
import { sendToBackground } from "../messenger";

export function CurrentBlock() {
  const [block, setBlock] = useState(0);

  async function getBlock() {
    console.log("getBlock");
    const resp = await sendToBackground({
      name: "eth",
      data: "what is block?",
    });
    console.log(resp);
    setBlock(block);
  }

  return (
    <div>
      <button onClick={() => getBlock()}>Get block</button>
      <p>Block: {block}</p>
    </div>
  );
}
