import { devtools, runtime } from "webextension-polyfill";
import type { DevtoolsPanels } from "webextension-polyfill/namespaces/devtools_panels";

const tabId = devtools.inspectedWindow.tabId;

let panel: DevtoolsPanels.ExtensionPanel;
let cache: Array<unknown> = [];

(async () => init())();

async function init() {
  // creating devtools panel
  panel = await devtools.panels.create(
    "ethui",
    "icons/ethui-48.png",
    "panel/index.html",
  );

  runtime.onMessage.addListener(cacheListener);
  panel.onShown.addListener(panelListener);
}

async function cacheListener(msg: unknown) {
  if ((msg as any)?.tabId !== tabId) return;

  cache.push(msg);
}

function panelListener() {
  panel.onShown.removeListener(panelListener); // run only once

  runtime.sendMessage({
    type: "start",
    tabId,
    data: cache,
  });
  cache = [];
  runtime.onMessage.removeListener(cacheListener);
}
