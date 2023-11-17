import { Json, JsonRpcRequest, JsonRpcResponse } from "@metamask/utils";
import browser, { type Runtime } from "webextension-polyfill";
import { ArrayQueue, ConstantBackoff, WebsocketBuilder } from "websocket-ts";

import { defaultSettings, loadSettings, type Settings } from "@/settings";

// init on load
(async () => init())();

let settings: Settings = defaultSettings;

/**
 * Loads the current settings, and listens for incoming connections (from the injected contentscript)
 */
export async function init() {
  settings = await loadSettings();

  // handle each incoming content script connection
  browser.runtime.onConnect.addListener((port: Runtime.Port) => {
    setupProviderConnection(port);
  });
}

/**
 * Sends a message to the devtools in every page.
 * Each message will include a timestamp.
 * @param msg - message to be sent to the devtools
 */
function notifyDevtools(
  tabId: number,
  type: "request" | "response" | "start",
  data?: JsonRpcResponse<Json> | JsonRpcRequest,
) {
  browser.runtime.sendMessage({
    type,
    tabId,
    data,
    timestamp: Date.now(),
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
  const tabId = port.sender!.tab!.id!;

  notifyDevtools(tabId, "start");

  const ws = new WebsocketBuilder(endpoint(port))
    .withBuffer(new ArrayQueue())
    .withBackoff(new ConstantBackoff(1000))
    .onMessage((_ins, event) => {
      // forward WS server messages back to the stream (content script)
      const data = JSON.parse(event.data);
      port.postMessage(data);

      notifyDevtools(tabId, "response", data);
    })
    .build();

  // forwarding incoming stream data to the WS server
  port.onMessage.addListener((data: JsonRpcResponse<Json>) => {
    ws.send(JSON.stringify(data));

    notifyDevtools(tabId, "request", data);
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
