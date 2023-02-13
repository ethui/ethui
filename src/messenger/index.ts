import browser from "webextension-polyfill";
import { getActiveTab } from "./utils";

export interface Request {
  name: string;
  relayId?: string;
  data: any;
}

export async function sendToBackground(req: Request) {
  try {
    const response = await browser.runtime.sendMessage(req);
    console.log("response from background: ", response);
    return response;
  } catch (error) {
    console.error("[sendToBackground] error: ", error);
    throw error;
  }
}

export async function sendToContentScript(
  tabID: number | undefined,
  req: Request
) {
  tabID = tabID || (await getActiveTab()).id!;

  try {
    const response = await browser.tabs.sendMessage(tabID, req);
    console.log("response from contentscript: ", response);
  } catch (error) {
    console.error("[sendToContentScript] error: ", error);
    throw error;
  }
}
