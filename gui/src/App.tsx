import { QueryClient, QueryClientProvider } from "react-query";
import { Route, Router } from "wouter";

import { HomePage, Navbar, Settings } from "./components/index";
import { useHashLocation } from "./hooks/hashLocation";

const queryClient = new QueryClient({
  defaultOptions: { queries: { suspense: true } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
