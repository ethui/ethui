import { createRoot } from "react-dom/client";
import { ExpandBtn } from "../components/ExpandBtn";
import "../global.css";

function Popup() {
  return (
    <main className="container mx-auto px-4">
      <h1 className="text-red-400">Popup</h1>
      <ExpandBtn>Expand</ExpandBtn>
    </main>
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
