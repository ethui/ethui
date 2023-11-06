import browser from "webextension-polyfill";

browser.devtools.panels.create(
  "RPC Iron Calls",
  "icons/iron-48.png",
  "panel.html",
);
