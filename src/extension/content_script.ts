console.log("Content script works!");

(async () => {
  const src = chrome.runtime.getURL("content_script_main.js");
  const contentMain = await import(/*webpackIgnore: true*/ src);
  contentMain.main();
})();
