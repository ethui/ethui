import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router } from "wouter";

import { RemoteState } from "@iron/state/src/client";

import {
  CurrentBlock,
  ExpandBtn,
  HomePage,
  Navbar,
  Settings,
  expand,
} from "./components/index";
import { ExtensionContext } from "./context";
import "./global.css";
import { useHashLocation } from "./hooks/hashLocation";

interface Props {
  remoteState: RemoteState;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

export function Expanded({ remoteState }: Props) {
  return (
    <ExtensionContext.Provider value={{ remoteState }}>
      <QueryClientProvider client={queryClient}>
        <div className="bg-slate-200 min-h-screen p-4">
          <Router hook={useHashLocation}>
            <main className="container mx-auto px-4 py-4 bg-white rounded-box ">
              <Navbar />
              <div className="gap-4 items-center py-8 px-4">
                <Route path="/" component={HomePage} />
                <Route path="/settings" component={Settings} />
              </div>
            </main>
          </Router>
        </div>
      </QueryClientProvider>
    </ExtensionContext.Provider>
  );
}

export function Popup({ remoteState }: Props) {
  // let's skip the popup for now (or even forever?)
  expand();

  return (
    <ExtensionContext.Provider value={{ remoteState }}>
      <QueryClientProvider client={queryClient}>
        <main className="container bg-white prose">
          <div className="navbar bg-neutral text-neutral-content">
            <a className="btn btn-ghost normal-case text-xl">Iron Wallet</a>
          </div>
          <ExpandBtn>Expand</ExpandBtn>
          <CurrentBlock />
        </main>
      </QueryClientProvider>
    </ExtensionContext.Provider>
  );
}
