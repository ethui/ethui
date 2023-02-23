import { createRoot } from "react-dom/client";
import { CurrentBlock } from "../components/CurrentBlock";
import { Navbar } from "../components/Navbar";
import { Settings } from "../components/settings";
import { Route, Router } from "wouter";
import { useHashLocation } from "../hooks/hashLocation";

import "../global.css";
import { Settings } from "../components/settings";

function Expanded() {
  return (
    <div className="bg-slate-200 h-screen p-4">
      <Router hook={useHashLocation}>
        <main className="container mx-auto px-4 py-4 bg-white rounded-box ">
          <Navbar />
          <div className="gap-4 items-center py-8 px-4">
            <Route path="/" component={CurrentBlock} />
            <Route path="/settings" component={Settings} />
          </div>
        </main>
      </Router>
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
