import browser, { type Runtime } from "webextension-polyfill";
import { ArrayQueue, ConstantBackoff, WebsocketBuilder } from "websocket-ts";

import { defaultSettings, loadSettings, type Settings } from "@/settings";

// init on load
(async () => init())();

let settings: Settings = defaultSettings;
const ports: browser.Runtime.Port[] = [];

interface Tab {
  port?: Runtime.Port;
  devtools?: Runtime.Port;
  panel?: Runtime.Port;
}

const tabs: Map<number, Tab> = new Map();

/**
 * Loads the current settings, and listens for incoming connections (from the injected contentscript)
 */
export async function init() {
  settings = await loadSettings();

  // handle each incoming content script connection
  browser.runtime.onConnect.addListener((port: Runtime.Port) => {
    if (port.name.startsWith("iron:devtools/")) {
      const tabId = Number(port.name.split("/")[1]);

      const tab = tabs.get(tabId);
      if (tab) tab.devtools = port;

      port.onDisconnect.addListener(function () {
        const tab = tabs.get(tabId);
        if (tab) tab.devtools = undefined;
      });
      // no need to listen to messages from devtools yet
      /*
    port.onMessage.addListener(function (msg) {
			// Received message from devtools. Do something:
			console.log("Received message from devtools page", msg);
		});
    */
    } else if (port.name.startsWith("iron:panel")) {
      const tabId = Number(port.name.split("/")[1]);
      tabs.get(tabId)!.panel = port;
    } else {
      const tabId = port.sender!.tab!.id!;
      tabs.set(tabId, { port });
      setupProviderConnection(tabId, port);
    }
  });
}

/**
 * Sends a message to the devtools in every page.
 * Each message is appended with a timestamp.
 * @param msg - message to be sent to the devtools
 */
function notifyDevtools(tabId: number, msg: object) {
  const tab = tabs.get(tabId);
  if (!tab?.devtools) return;
  tab.devtools.postMessage({ ...msg, timestamp: Date.now() });
}

/**
 * Set up connection stream to new content scripts.
 * The stream data is attached to a WebsocketConnection to server run by the Iron desktop app
 *
 * The WS connection is created lazily (when the first data packet is sent).
 * This behaviour prevents initiating connections for browser tabs where `window.ethereum` is not actually used
 */
export function setupProviderConnection(tabId: number, port: Runtime.Port) {
  const ws = new WebsocketBuilder(endpoint(port))
    .withBuffer(new ArrayQueue())
    .withBackoff(new ConstantBackoff(1000))
    .onMessage((_ins, event) => {
      // forward WS server messages back to the stream (content script)
      const data = JSON.parse(event.data);
      port.postMessage(data);

      // send RPC response to devtools
      notifyDevtools(tabId, { type: "response", data });
    })
    .build();

  // forwarding incoming stream data to the WS server
  port.onMessage.addListener((data: unknown) => {
    ws.send(JSON.stringify(data));

    // send RPC request to devtools
    notifyDevtools(tabId, { type: "request", data });
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
    Object.entries(p).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;

  return Object.entries(filtered)
    .map((kv) => kv.map(encodeURIComponent).join("="))
    .join("&");
}
