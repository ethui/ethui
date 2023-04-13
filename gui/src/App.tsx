import { Provider } from "@ethersproject/providers";
import { providers } from "ethers";
import { createContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { configureChains } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { Route, Router } from "wouter";

import { HomePage, Navbar, Settings } from "./components/index";
import { useHashLocation } from "./hooks/hashLocation";
import { useInvoke } from "./hooks/tauri";
import { Network } from "./types";

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

const WagmiContext = createContext({});

export default function App() {
  const [provider, setProvider] = useState<providers.JsonRpcProvider | null>(
    null
  );
  const { data: network } = useInvoke<Network>("get_current_network");

  useEffect(() => {
    if (!network) return;
    const { provider } = configureChains(
      [],
      [
        jsonRpcProvider({
          rpc: () => ({ http: network?.http_url }),
        }),
      ]
    );
    setProvider(provider);
  }, [network]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiContext.Provider value={{}}>
        <div className="bg-slate-200 min-h-screen p-4">
          <Router hook={useHashLocation}>
            <main className="container mx-auto">
              <Navbar />
              <div className="gap-4 items-center bg-white">
                <Route path="/" component={HomePage} />
                <Route path="/settings" component={Settings} />
              </div>
            </main>
          </Router>
        </div>
      </WagmiContext.Provider>
    </QueryClientProvider>
  );
}
