import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import "../global.css";

function expand() {
  const url = browser.runtime.getURL("expanded.html");
  browser.tabs.create({ url }).then(() => window.close());
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
