import browser from "webextension-polyfill";

export async function sendMsgToBackground(type: any, data = null) {
  try {
    const response = await browser.runtime.sendMessage({ type, data });
    return response;
  } catch (error) {
    console.error("[sendMsgToBackground] error: ", error);
    return null;
  }
}

export async function sendMsgToContentScript(
  tabID: number,
  type: any,
  data = null
) {
  try {
    const response = await browser.tabs.sendMessage(tabID, { type, data });
    console.log("response: ", response);
  } catch (error) {
    console.error("[sendMsgToContentScript] error: ", error);
    return null;
  }
}
