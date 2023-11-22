import log from "loglevel";
import { storage } from "webextension-polyfill";

export interface Settings {
  logLevel: "info" | "debug" | "warn" | "error";
  endpoint: string;
}

export const defaultSettings: Settings = {
  logLevel: "info",
  endpoint: "ws://localhost:9002",
};

export async function loadSettings() {
  const settings = (await storage.sync.get(defaultSettings)) as Settings;
  log.setLevel(settings.logLevel);
  return settings;
}
