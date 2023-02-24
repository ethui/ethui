import browser from "webextension-polyfill";
import { Request } from "./types";

export async function requestToBackground(req: Request) {
  try {
    const response = await browser.runtime.sendMessage(req);
    return response;
  } catch (error) {
    console.error("[sendToBackground] error: ", error);
    throw error;
  }
}

// export async function requestToContentScript(
//   tabID: number | undefined,
//   req: Request
// ) {
//   tabID = tabID || (await getActiveTab()).id!;
//
//   try {
//     const response = await browser.tabs.sendMessage(tabID, req);
//     console.log("response from contentscript: ", response);
//   } catch (error) {
//     console.error("[sendToContentScript] error: ", error);
//     throw error;
//   }
// }
