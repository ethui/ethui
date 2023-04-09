import PortStream from "extension-port-stream";
import pump, { type Stream } from "pump";
import { type Duplex } from "stream";
import browser, { type Runtime } from "webextension-polyfill";
import { Websocket, WebsocketBuilder } from "websocket-ts";

import ObjectMultiplex from "@metamask/object-multiplex";

// init on load
(async () => init())();

export async function init() {
  console.log("[background] init");
  handleConnections();
}

function handleConnections() {
  browser.runtime.onConnect.addListener(async (remotePort: Runtime.Port) => {
    console.log("[background] onConnect", remotePort);
    setupProviderConnection(remotePort);
  });
}

export function setupProviderConnection(remotePort: Runtime.Port) {
  let ws: Websocket;

  const stream = new PortStream(remotePort);
  const mux = new ObjectMultiplex();
  pump(stream, mux as unknown as Duplex, stream, (err) => {
    if (err && ws) {
      console.error(err);
      ws.close();
      console.log("closing");
    }
  });
  const outStream = mux.createStream("metamask-provider") as unknown as Duplex;

  const params: Record<string, string> = {
    origin: (remotePort.sender as unknown as { origin: string }).origin,
  };

  if (remotePort.sender?.tab?.id) {
    params.tabId = remotePort.sender.tab.id.toString(10);
  }

  if (remotePort.sender?.tab?.favIconUrl) {
    params.favicon = remotePort.sender.tab.favIconUrl;
  }

  if (remotePort.sender?.tab?.url) {
    params.url = remotePort.sender.tab.url;
  }

  ws = new WebsocketBuilder(`ws://localhost:9002?${encodeUrlParams(params)}`)
    .onMessage((_i, e) => {
      // write back to page provider
      const data = JSON.parse(e.data);
      console.log("onMessage", data);
      outStream.write(data);
    })
    .build();

  outStream.on("data", (data: unknown) => {
    // forward all messages to ws
    console.log("req:", data);
    ws.send(JSON.stringify(data));
  });
}

function encodeUrlParams(p: Record<string, string>) {
  return Object.entries(p)
    .map((kv) => kv.map(encodeURIComponent).join("="))
    .join("&");
}
