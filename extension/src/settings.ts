import log from "loglevel";
import browser from "webextension-polyfill";

export interface Settings {
  logLevel: "info" | "debug" | "warn" | "error";
  endpoint: string;
}

export const defaultSettings: Settings = {
  logLevel: "info",
  endpoint: "ws://localhost:9002",
};

export async function loadSettings() {
  const settings = (await browser.storage.sync.get(
    defaultSettings
  )) as Settings;
  log.setLevel(settings.logLevel);
  return settings;
}
