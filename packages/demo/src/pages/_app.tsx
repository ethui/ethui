import { Web3, Navbar } from "@/components";
import type { AppProps } from "next/app";
import Head from "next/head";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@ethui/ui/tailwind.css";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>ethui Demo</title>
        <meta name="description" content="A web3 demo app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main>
        <Web3>
          <Navbar />
          <div>
            <Component {...pageProps} />
          </div>
        </Web3>
      </main>
    </QueryClientProvider>
  );
}
