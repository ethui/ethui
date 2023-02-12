import { createRoot } from "react-dom/client";

function Expanded() {
  return <div>Expanded!</div>;
}

function init() {
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find #app-container");
  }
  const root = createRoot(appContainer);
  root.render(<Expanded />);
}

init();
