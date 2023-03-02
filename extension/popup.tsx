import { createRoot } from "react-dom/client";

import { Popup } from "@iron/ui/roots";
import React from "react";

function init() {
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  root.render(<Popup />);
}

init();
