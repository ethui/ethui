import log from "loglevel";
import { storage } from "webextension-polyfill";

const { PROD } = import.meta.env;

export interface Settings extends Record<string, string> {
  logLevel: "info" | "debug" | "warn" | "error";
  endpoint: string;
}

export const defaultSettings: Settings = {
  logLevel: "debug",
  endpoint: PROD ? "ws://localhost:9002" : "ws://localhost:9102",
};

export async function loadSettings() {
  const settings = (await storage.sync.get(defaultSettings)) as Settings;
  log.setLevel(settings.logLevel);
  return settings;
}
