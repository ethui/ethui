import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router } from "wouter";

import { CurrentBlock, HomePage, Navbar, Settings } from "./components/index";
import { useHashLocation } from "./hooks/hashLocation";

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

export default function App() {
  return (
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
  );
}
