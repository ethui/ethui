import { storage } from "webextension-polyfill";

import { defaultSettings, Settings } from "@/settings";

const $logLevel = document.getElementById("log-level") as HTMLInputElement;
const $endpoint = document.getElementById("endpoint") as HTMLInputElement;
const $status = document.getElementById("status") as HTMLDivElement;
const $save = document.getElementById("save") as HTMLButtonElement;

// Saves options to chrome.storage
const saveOptions = () => {
  const options: Settings = {
    logLevel:
      ($logLevel.value as Settings["logLevel"]) || defaultSettings.logLevel,
    endpoint: $endpoint.value || defaultSettings.endpoint,
  };

  storage.sync.set(options).then(() => {
    // Update status to let user know options were saved.
    $status.textContent = "Options saved. Restart browser to take effect";
    setTimeout(() => {
      $status.textContent = "";
    }, 750);
  });
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  storage.sync.get(defaultSettings).then((items) => {
    $logLevel.value = items.logLevel;
    $endpoint.value = items.endpoint;
  });
};

restoreOptions();
$save.addEventListener("click", saveOptions);
