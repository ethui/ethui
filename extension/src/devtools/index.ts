import browser from "webextension-polyfill";

import { type DevtoolsMsg } from "@/types";

let extensionWindow: Window;
const requests: DevtoolsMsg[] = [];

browser.devtools.panels
  .create("Iron Wallet", "icons/iron-48.png", "panel/index.html")
  .then(async (extensionPanel) => {
    try {
      const [{ id }] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const port = browser.runtime.connect({
        name: `iron:devtools/${id}`,
      });
      port.onMessage.addListener(function (msg: DevtoolsMsg) {
        console.log("received", msg);
        // Write information to the panel, if exists.
        requests.push(msg);

        // make sure identical ids are together in the array and by time using timestamp
        requests.sort((a: DevtoolsMsg, b: DevtoolsMsg) => {
          if (a.data.id === b.data.id) {
            return a.timestamp - b.timestamp;
          }
          if (typeof a.data.id === "number" && typeof b.data.id === "number") {
            return a.data.id - b.data.id;
          }
          return 0;
        });

        if (extensionWindow) {
          showAllRequests();
        }
      });

      extensionPanel.onShown.addListener(function tmp(panelWindow) {
        extensionPanel.onShown.removeListener(tmp); // Run once only
        extensionWindow = panelWindow;

        showAllRequests();
        /*
			// pass a message back:
				extensionWindow.respond = function (msg: stirng) {
					port.postMessage(msg);
				};
			*/
      });
    } catch (e) {
      // console.error(e);
    }
  });

function appendRequest(msg: DevtoolsMsg) {
  //get the rpc-calls id in body and append the msg
  const rpcCalls = extensionWindow.document.getElementById("rpc-calls");
  if (!rpcCalls) {
    return;
  }
  // format time in HH:MM:SS with the day
  const date = new Date(msg.timestamp).toLocaleString("en-US", {
    hour12: false,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });

  const div = extensionWindow.document.createElement("div");
  // create a block that contains in each line the method and the params and the jsonrpc,
  // one for each line and the params formatted well along with the key names
  if (msg.type === "request") {
    const spanType = extensionWindow.document.createElement("span");
    spanType.style.color = "blue";
    const timestamptext = extensionWindow.document.createTextNode(`[${date}] `);
    spanType.appendChild(timestamptext);

    div.appendChild(spanType);

    if ("method" in msg.data) {
      div.appendChild(extensionWindow.document.createTextNode(msg.data.method));
    }

    if ("params" in msg.data && msg.data.params) {
      div.appendChild(extensionWindow.document.createElement("br"));
      const params = extensionWindow.document.createElement("span");
      const jsonString =
        "<pre>" + JSON.stringify(msg.data.params, null, 4) + "</pre>";
      params.innerHTML = jsonString;

      div.appendChild(extensionWindow.document.createTextNode("Params: "));
      div.appendChild(params);
    }
  } else {
    div.appendChild(extensionWindow.document.createTextNode("Response:"));
    div.appendChild(extensionWindow.document.createElement("br"));

    if ("result" in msg.data) {
      // make sure to remove the last \n
      const resultFormatted = JSON.stringify(msg.data.result, null, 4).replace(
        /\n$/,
        "",
      );

      div.appendChild(extensionWindow.document.createTextNode(resultFormatted));
    } else {
      if ("error" in msg.data) {
        const errorFormatted = JSON.stringify(msg.data.error, null, 4);
        div.appendChild(
          extensionWindow.document.createTextNode(errorFormatted),
        );
      }
    }
  }

  div.appendChild(extensionWindow.document.createElement("br"));
  rpcCalls.appendChild(div);
}

function showAllRequests() {
  const rpcCalls = extensionWindow.document.getElementById("rpc-calls");

  // remove everything from the rpc-calls div
  while (rpcCalls && rpcCalls.firstChild) {
    rpcCalls.removeChild(rpcCalls.firstChild);
  }

  if (!rpcCalls) {
    return;
  }
  requests.forEach((msg) => {
    appendRequest(msg);
  });

  // scroll to the bottom
  window.scrollTo(0, document.body.scrollHeight);
}
