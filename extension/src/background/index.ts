import PortStream from "extension-port-stream";
import log from "loglevel";
import browser, { type Runtime } from "webextension-polyfill";
import { ConstantBackoff, Websocket, WebsocketBuilder } from "websocket-ts";

import { type Settings, defaultSettings, loadSettings } from "../settings";

// init on load
(async () => init())();

let settings: Settings = defaultSettings;

/**
 * Loads the current settings, and listens for incoming connections (from the injected contentscript)
 */
export async function init() {
  settings = await loadSettings();

  // handle each incoming content script connection
  browser.runtime.onConnect.addListener(async (remotePort: Runtime.Port) => {
    setupProviderConnection(remotePort);
  });
}

/**
 * Set up connection stream to new content scripts.
 * The stream data is attached to a WebsocketConnection to server run by the Iron desktop app
 *
 * The WS connection is created lazily (when the first data packet is sent).
 * This behaviour prevents initiating connections for browser tabs where `window.ethereum` is not actually used
 */
export function setupProviderConnection(port: Runtime.Port) {
  // the future connection
  let ws: Websocket | undefined;

  // because of the lazy connection, there is a slight delay between the first request being sent from the page,
  // and the WS connection being ready to receive it.
  // During that period, we keep a backlog of pending msgs to flush once the connection is ready
  const backlog: unknown[] = [];

  const stream = new PortStream(port);

  // pre-build the websocket connection
  // not actually buit until the first message arrives
  const wsBuilder = new WebsocketBuilder(endpoint(port))
    .withBackoff(new ConstantBackoff(1000))
    .onOpen((instance, event) => {
      // connection is ready. set the upper `ws` value, and flush the backlog
      ws = instance;
      log.debug("onOpen", instance, event);
      backlog.map((data) => instance.send(JSON.stringify(data)));
    })
    .onClose((instance, event) => {
      log.debug("onClose", instance, event);
    })
    .onMessage((_ins, event) => {
      // forward WS server messages back to the stream (content script)
      const data = JSON.parse(event.data);
      log.debug("onMessage", data);
      stream.write(data);
    });

  // forwarding incoming stream data to the WS server
  stream.on("data", (data: unknown) => {
    if (!ws) {
      // connection not ready yet: push to backlog and initiate connection
      backlog.push(data);
      wsBuilder.build();
    } else {
      // connection is ready, forward the message normaly
      log.debug("request", data);
      ws.send(JSON.stringify(data));
    }
  });
}

/**
 * The URL of the Iron server if given from the settings, with connection metadata being appended as URL params
 */
function endpoint(port: Runtime.Port) {
  return `${settings.endpoint}?${connParams(port)}`;
}

/**
 * URL-encoded connection info
 *
 * This includes all info that may be useful for the Iron server.
 */
function connParams(port: Runtime.Port) {
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

/**
 * URL-encode a set of params
 */
function encodeUrlParams(p: Record<string, string | undefined>) {
  const filtered: Record<string, string> = Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== undefined)
  ) as Record<string, string>;

  return Object.entries(filtered)
    .map((kv) => kv.map(encodeURIComponent).join("="))
    .join("&");
}
