import { WindowPostMessageStream } from "@metamask/post-message-stream";
import log from "loglevel";
import { Duplex } from "stream";
import { runtime } from "webextension-polyfill";

function init() {
  if (document.prerendering) {
    document.addEventListener("prerenderingchange", () => {
      if (!document.prerendering) {
        init();
      }
    });
    return;
  }

  const inpageStream = new WindowPostMessageStream({
    name: "iron:contentscript",
    target: "iron:inpage",
  }) as unknown as Duplex;

  log.debug("inpageStream", inpageStream);
  // bg stream
  const bgPort = runtime.connect({ name: "iron:contentscript" });

  // inpage -> bg
  inpageStream.on("data", (data) => {
    log.debug(data);
    bgPort.postMessage(data);
  });
  // bg -> inpage
  bgPort.onMessage.addListener((data) => {
    log.debug(data);
    //inpageStream.write(data);
    // add data to the id rpc-calls
    const rpcCalls = document.getElementById("rpc-calls");
    if (rpcCalls) {
      const newCall = document.createElement("div");
      newCall.innerText = JSON.stringify(data);
      rpcCalls.appendChild(newCall);
    }
  });
}

init();
