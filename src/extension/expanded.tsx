import { useState } from "react";
import { createRoot } from "react-dom/client";
import { CurrentBlock } from "../components/CurrentBlock";
import "../global.css";

function Expanded() {
  return (
    <div className="bg-slate-200 h-screen p-4">
      <main className="container mx-auto px-4 py-4 bg-white">
        <h1>Expanded!</h1>
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
