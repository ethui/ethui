import { createRoot } from "react-dom/client";
import { Expanded } from "@iron/ui/roots";

function init() {
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  root.render(<Expanded />);
}

init();
