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

export function Expanded() {
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

export function Popup() {
  // let's skip the popup for now (or even forever?)
  expand();

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
