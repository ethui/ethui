import browser from "webextension-polyfill";

/**
 * listen to requests from contentscript
 * try to handle them with a given callback, and reply with result/error
 */
export function listen(callback: Callback) {
  browser.runtime.onMessage.addListener((req, sender, sendResponse: any) => {
    console.log("from cs", req);
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
