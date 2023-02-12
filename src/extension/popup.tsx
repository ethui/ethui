import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import "../global.css";
import { sendMsgToBackground, sendMsgToContentScript } from "../messenger";

function expand() {
  const url = browser.runtime.getURL("src/extension/expanded.html");
  browser.tabs.create({ url }).then(() => window.close());
}

function sendMsg() {
  sendMsgToBackground({ type: "foo", data: { message: "bar" } });
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    tabs.forEach((tab) => {
      sendMsgToContentScript(tab.id!, {
        type: "foo",
        data: { message: "bar" },
      });
    });
  });
}

function Popup() {
  return (
    <div>
      <h1 className="text-red-400">Popup</h1>
      <button
        onClick={() => {
          expand();
        }}
      >
        Expand
      </button>
      <button
        onClick={() => {
          sendMsg();
        }}
      >
        Send Msg
      </button>
    </div>
  );
}

function init() {
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  root.render(<Popup />);
}

init();
