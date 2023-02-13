import { createRoot } from "react-dom/client";
import { CurrentBlock } from "../components/CurrentBlock";
import "../global.css";

function Expanded() {
  return (
    <div className="bg-slate-200 h-screen p-4">
      <main className="container mx-auto px-4 py-4 bg-white rounded-box prose">
        <div className="navbar bg-neutral text-neutral-content rounded-box">
          <a className="btn btn-ghost normal-case text-xl">Iron Wallet</a>
        </div>
        <CurrentBlock />
      </main>
    </div>
  );
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
