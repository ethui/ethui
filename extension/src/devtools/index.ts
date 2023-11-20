import browser from "webextension-polyfill";
import { DevtoolsPanels } from "webextension-polyfill/namespaces/devtools_panels";

import type { Request, Response } from "@/types";

const tabId = browser.devtools.inspectedWindow.tabId;

let panel: DevtoolsPanels.ExtensionPanel;
let cache: Array<Request | Response> = [];

(async () => init())();

async function init() {
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
