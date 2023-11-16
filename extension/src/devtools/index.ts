import browser from "webextension-polyfill";
import { DevtoolsPanels } from "webextension-polyfill/namespaces/devtools_panels";

import type { Request, Response } from "@/types";

let panel: DevtoolsPanels.ExtensionPanel;
let tabId: number | undefined;
let cache: Array<Request | Response> = [];

(async () => init())();

async function init() {
  console.log("here", browser.devtools.inspectedWindow);
  // get tab ID
  const [{ id }] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  tabId = id;

  // creating devtools panel
  panel = await browser.devtools.panels.create(
    "Iron Wallet",
    "icons/iron-48.png",
    "panel/index.html",
  );

  browser.runtime.onMessage.addListener(cacheListener);
  panel.onShown.addListener(panelListener);
}

function cacheListener(msg: Request | Response) {
  if (msg.tabId != tabId) return;

  cache.push(msg);
}

function panelListener() {
  panel.onShown.removeListener(panelListener); // run only once

  browser.runtime.sendMessage({
    type: "start",
    tabId,
    data: cache,
  });
  cache = [];
  browser.runtime.onMessage.removeListener(cacheListener);
}
