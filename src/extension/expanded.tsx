import { createRoot } from "react-dom/client";
import { CurrentBlock } from "../components/CurrentBlock";
import { Navbar } from "../components/Navbar";
import { useStore } from "../store";
import "../global.css";
import { Settings } from "../components/settings";

function Expanded() {
  const [mnemonic, setMnemonic] = useStore((state) => [
    state.mnemonic,
    state.setMnemonic,
  ]);

  return (
    <div className="bg-slate-200 h-screen p-4">
      <main className="container mx-auto px-4 py-4 bg-white rounded-box ">
        <Navbar />
        <div className="gap-4 items-center py-8 px-4">
          <CurrentBlock />
          <hr className="divider my-2" />
          <Settings />
        </div>
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
