import PortStream from "extension-port-stream";
import pump from "pump";
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

export function setupProviderConnection(port: Runtime.Port) {
  let ws: Websocket | null = null;

  const stream = new PortStream(port);
  const mux = new ObjectMultiplex();
  pump(stream, mux as unknown as Duplex, stream, (err) => {
    if (err && ws) {
      console.error(err);
      ws.close();
      console.log("closing");
    }
  });
  const outStream = mux.createStream("metamask-provider") as unknown as Duplex;

  ws = new WebsocketBuilder(`ws://localhost:9002?${connectionParams(port)}`)
    .onMessage((_i, e) => {
      // write back to page provider
      const data = JSON.parse(e.data);
      console.log("onMessage", data);
      outStream.write(data);
    })
    .build();

  outStream.on("data", (data: unknown) => {
    if (!ws) return;

    // forward all messages to ws
    console.log("req:", data);
    ws.send(JSON.stringify(data));
  });
}

function connectionParams(port: Runtime.Port) {
  const sender = port.sender;
  const tab = sender?.tab;

  const params: Record<string, string | undefined> = {
    origin: (port.sender as unknown as { origin: string }).origin,
    tabId: tab?.id?.toString(10),
    favicon: tab?.favIconUrl,
    url: tab?.url,
    title: tab?.title,
  };

  return encodeUrlParams(params);
}

function encodeUrlParams(p: Record<string, string | undefined>) {
  const filtered: Record<string, string> = Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined)
  ) as Record<string, string>;

  return Object.entries(filtered)
    .map((kv) => kv.map(encodeURIComponent).join("="))
    .join("&");
}
