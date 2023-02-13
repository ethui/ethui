import browser from "webextension-polyfill";
import { Request } from "../messenger/types";

interface Event {
  data: Request;
  ports: MessagePort[];
}

type Callback = (event: Request) => Promise<unknown>;

/**
 * listen to messages from the inpage script
 *
 * Messages marked with `_relay: true` will be forwarded to the background script
 * Otherwise, they're processed directly by the given callback
 *
 * Regardless, a response is to be sent with either a result or an console.console.error
 */
export function listenWithBackgroundRelay(callback: Callback) {
  window.addEventListener("message", async ({ data, ports }: Event) => {
    let response: Record<string, any> = {};
    try {
      if (data._relay) {
        response = await browser.runtime.sendMessage(data);
      } else {
        response.result = await callback(data);
      }
    } catch (err) {
      response.error = err; //ports![0].postMessage({ error: err });
    }
    ports![0].postMessage(response);
  });
}
