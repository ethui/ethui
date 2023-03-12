import * as Comlink from "comlink";
import {
  createBackgroundEndpoint,
  isMessagePort,
} from "comlink-extension/src/index";
import { nanoid } from "nanoid";
import { Runtime } from "webextension-polyfill";

import { initState, listeners, settings } from "./settings";

export async function setupStateServer(port: Runtime.Port) {
  if (isMessagePort(port)) return;

  Comlink.expose(settings, createBackgroundEndpoint(port));
}

export async function setupStatePing(port: Runtime.Port) {
  const id = nanoid();
  listeners.set(id, port);

  port.onDisconnect.addListener(() => {
    listeners.delete(id);
  });
}
