import PortStream from "extension-port-stream";
import log from "loglevel";
import pump from "pump";
import { type Duplex } from "stream";
import browser, { type Runtime } from "webextension-polyfill";
import { Websocket, WebsocketBuilder } from "websocket-ts";

import ObjectMultiplex from "@metamask/object-multiplex";

import { type Settings, defaultSettings, loadSettings } from "./settings";

// init on load
(async () => init())();

let settings: Settings = defaultSettings;

export async function init() {
  settings = (await loadSettings()) as Settings;
  log.setLevel(settings.logLevel);
  handleConnections();
}

function handleConnections() {
  browser.runtime.onConnect.addListener(async (remotePort: Runtime.Port) => {
    setupProviderConnection(remotePort);
  });
}

export function setupProviderConnection(port: Runtime.Port) {
  let ws: Websocket | null = null;

  const stream = new PortStream(port);
  const mux = new ObjectMultiplex();
  pump(stream, mux as unknown as Duplex, stream, (err) => {
    if (err && ws) {
      log.warn(err);
      log.debug("closing WS");
      ws.close();
    }
  });
  const outStream = mux.createStream("metamask-provider") as unknown as Duplex;

  ws = new WebsocketBuilder(`${settings.endpoint}?${connectionParams(port)}`)
    .onMessage((_i, e) => {
      // write back to page provider
      const data = JSON.parse(e.data);
      log.debug("onMessage", data);
      outStream.write(data);
    })
    .build();

  outStream.on("data", (data: unknown) => {
    if (!ws) return;

    // forward all messages to ws
    log.debug("request", data);
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
