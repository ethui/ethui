import browser from "webextension-polyfill";
import { DevtoolsPanels } from "webextension-polyfill/namespaces/devtools_panels";

import type { Request, Response } from "@/types";

// let extensionWindow: Window;
let panel: DevtoolsPanels.ExtensionPanel;
const cache: Array<Request | Response> = [];

(async () => init())();

async function init() {
  // get tab ID
  const [{ id }] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  // creating devtools panel
  panel = await browser.devtools.panels.create(
    "Iron Wallet",
    "icons/iron-48.png",
    "panel/index.html",
  );

  // collecting each request/response for this tab
  browser.runtime.onMessage.addListener((msg: Request | Response) => {
    if (msg.tabId != id) return;

    cache.push(msg);
  });

  panel.onShown.addListener(function tmp() {
    // Run only once
    panel.onShown.removeListener(tmp);

    browser.runtime.sendMessage({
      type: "devtools-panel-start",
      tabId: id,
      data: cache,
    });
  });
}
