import { Request } from "../messenger/types";

/**
 * sends a request to be processed in the background script
 */
export function requestToBackground(op: Omit<Request, "relay">) {
  return request({ ...op, _relay: true });
}

/**
 * sends a request to be processed directly by the contentscript
 */
export function requestToContent(op: Omit<Request, "relay">) {
  return request({ ...op, _relay: false });
}

/**
 * Internal request/response logic
 *
 * Requests are handled by creating a one-off `MessageChannel`
 * alongside a promise which resolves with the first message received
 *
 * TODO: is it a good idea to create one of MessageChannels for every request?
 */
function request(op: Request) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();

    channel.port1.onmessage = ({ data }) => {
      channel.port1.close();
      if (data.error) {
        reject(data.error);
      } else {
        resolve(data.result);
      }
    };

    window.postMessage(op, "*", [channel.port2]);
  });
}
