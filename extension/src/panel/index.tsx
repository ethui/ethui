import React from "react";
import ReactDOM from "react-dom/client";
import browser from "webextension-polyfill";

const App = () => {
  const port = browser.runtime.connect.toString();

  console.log(port);
  return port;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    Hello, world!
  </React.StrictMode>,
);
