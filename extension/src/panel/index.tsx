import React from "react";
import ReactDOM from "react-dom/client";
import browser from "webextension-polyfill";

async function connect() {
  const [{ id }] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  const port = browser.runtime.connect({
    name: `iron:panel/${id}`,
  });

  return <></>;
}

function App() {
  connect();

  return <></>;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    Hello, world!
  </React.StrictMode>,
);
