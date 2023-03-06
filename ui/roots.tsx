import React from "react";
import {
  CurrentBlock,
  Navbar,
  Settings,
  ExpandBtn,
  expand,
} from "./components";
import { Route, Router } from "wouter";
import { useHashLocation } from "./hooks/hashLocation";
import "./global.css";
import { type Stream } from "stream";
import { ExtensionContext } from "./context";

interface Props {
  stream?: Stream;
}

export function Expanded({ stream }: Props) {
  return (
    <ExtensionContext.Provider value={{ stream: stream! }}>
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
    </ExtensionContext.Provider>
  );
}

export function Popup({ stream }: Props) {
  // let's skip the popup for now (or even forever?)
  expand();

  return (
    <ExtensionContext.Provider value={{ stream: stream! }}>
      <main className="container bg-white prose">
        <div className="navbar bg-neutral text-neutral-content">
          <a className="btn btn-ghost normal-case text-xl">Iron Wallet</a>
        </div>
        <ExpandBtn>Expand</ExpandBtn>
        <CurrentBlock />
      </main>
    </ExtensionContext.Provider>
  );
}
