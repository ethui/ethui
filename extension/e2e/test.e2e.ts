// import { $, $$, browser, expect } from "@wdio/globals";
// import type { Capabilities } from "@wdio/types";

// const isFirefox =
//   (browser.capabilities as Capabilities.Capabilities).browserName === "firefox";

describe("Web Extension e2e test", () => {
  // it("should have injected the component from the content script", async () => {
  //   await browser.url("https://google.com");
  //   await expect($$("#extension-root")).toBeElementsArrayOfSize(1);
  // });
  //
  // it("can get cat facts", async () => {
  //   const extensionRoot = await $("#extension-root");
  //   const getCatFactBtn = await extensionRoot.$("aria/Get a Cat Fact!");
  //   await getCatFactBtn.click();
  //   await expect(extensionRoot.$("p")).not.toHaveText(
  //     "Click the button to fetch a fact!"
  //   );
  // });
  //
  // if (!isFirefox) {
  //   it("should get cat facts in popup window", async () => {
  //     await browser.openExtensionPopup("My Web Extension");
  //
  //     const extensionRoot = await $("#extension-root");
  //     const getCatFactBtn = await extensionRoot.$("aria/Get a Cat Fact!");
  //     await getCatFactBtn.click();
  //     await expect(extensionRoot.$("p")).not.toHaveText(
  //       "Click the button to fetch a fact!"
  //     );
  //   });
  // }
});
