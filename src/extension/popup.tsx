import { createRoot } from "react-dom/client";
import { CurrentBlock } from "../components/CurrentBlock";
import { ExpandBtn } from "../components/ExpandBtn";
import "../global.css";

function Popup() {
  return (
    <main className="container bg-white prose">
      <div className="navbar bg-neutral text-neutral-content">
        <a className="btn btn-ghost normal-case text-xl">Iron Wallet</a>
      </div>
      <ExpandBtn>Expand</ExpandBtn>
      <CurrentBlock />
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
