import PortStream from "extension-port-stream";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";

import * as Constants from "@iron/constants";
import { setupStateClient } from "@iron/state/src/client";
import { Expanded } from "@iron/ui/roots";

function init() {
  const remoteState = setupStateClient();
  // const stream = initBackgroundStream();

  // browser.runtime.sendMessage({ msg: "ping" }).then((resp: unknown) => {
  //   console.log("resp: ", resp);
  // });

  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  root.render(<Expanded remoteState={remoteState} stream={undefined!} />);
}

// function initBackgroundStream() {
//   const port = browser.runtime.connect({ name: Constants.windows.expanded });
//   return new PortStream(port);
// }

init();
