import log from "loglevel";

export interface Settings {
  logLevel: "info" | "debug" | "warn" | "error";
  endpoint: string;
}

export const defaultSettings: Settings = {
  logLevel: "info",
  endpoint: "ws://localhost:9002",
};

export async function loadSettings() {
  const settings = (await chrome.storage.sync.get(defaultSettings)) as Settings;
  log.setLevel(settings.logLevel);
  return settings;
}
