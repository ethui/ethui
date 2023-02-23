import browser from "webextension-polyfill";

type Callback = (req: any) => Promise<unknown>;

/**
 * listen to requests from contentscript
 * try to handle them with a given callback, and reply with result/error
 */
export function listen(callback: Callback) {
  browser.runtime.onMessage.addListener((req, _sender, sendResponse: any) => {
    (async () => {
      try {
        const response = await callback(req);
        sendResponse({ result: response });
      } catch (err) {
        sendResponse({ error: err });
      }
    })();
    return true;
  });
}
