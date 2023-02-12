import { WindowPostMessageStream } from "@metamask/post-message-stream";
import { IronProvider, attachGlobalProvider } from "../provider";

const CONTENT_SCRIPT = "ironwallet-contentscript";
const INPAGE = "ironwallet-inpage";

function main() {
  console.log("[inpage] init");
  const ironStream = new WindowPostMessageStream({
    name: INPAGE,
    target: CONTENT_SCRIPT,
  });

  ironStream.on("data", (data) => console.log(`inpage received data ${data}`));
  ironStream.write("hello");

  const provider = new IronProvider({ connectionStream: ironStream });
  attachGlobalProvider(provider);
}

main();
