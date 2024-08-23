import { List } from "@mui/material";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api";

import { GeneralSettings } from "@ethui/types/settings";
import { useInvoke } from "@/hooks";
import { useBalances, useNetworks } from "@/store";
import { ERC20View } from "./ERC20View";

export function BalancesList({
  onTotalPriceChange,
}: {
  onTotalPriceChange: (totalPrice: number) => void;
}) {
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [erc20Price, setErc20Price] = useState<number>(0);

  useEffect(() => {
    const combinedPrice = ethPrice + erc20Price;
    onTotalPriceChange(combinedPrice);
  }, [ethPrice, erc20Price, onTotalPriceChange]);

  return (
    <List sx={{ maxWidth: 350 }}>
      <BalanceETH onPriceChange={setEthPrice} />
      <BalancesERC20 onPriceChange={setErc20Price} />
    </List>
  );
}

function BalanceETH({
  onPriceChange,
}: {
  onPriceChange: (price: number) => void;
}) {
  const currentNetwork = useNetworks((s) => s.current);
  const balance = useBalances((s) => s.nativeBalance);
  const [price, setPrice] = useState<bigint | null>(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const fetchedPrice = await invoke<bigint>("exchange_rates_get_price", {
          base_asset: currentNetwork?.currency,
          quote_asset: "USD",
        });
        setPrice(fetchedPrice);
      } catch (error) {
        console.error("Error fetching price:", error);
      }
    }

    fetchPrice();

    const interval = setInterval(fetchPrice, 30000);

    return () => clearInterval(interval);
  }, [currentNetwork?.currency]);

  useEffect(() => {
    if (price && balance) {
      const totalETHPrice = (Number(price) * Number(balance)) / 10 ** 18;
      onPriceChange(totalETHPrice);
    }
  }, [price, balance, currentNetwork?.decimals, onPriceChange]);

  if (!currentNetwork || !balance) return null;

  return (
    <ERC20View
      balance={balance}
      decimals={currentNetwork.decimals}
      symbol={currentNetwork.currency}
      chainId={currentNetwork.chain_id}
      price={Number(price) || 0.0}
    />
  );
}

function BalancesERC20({
  onPriceChange,
}: {
  onPriceChange: (price: number) => void;
}) {
  const currentNetwork = useNetworks((s) => s.current);
  const balances = useBalances((s) => s.erc20Balances);
  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  const [prices, setPrices] = useState<{ [symbol: string]: bigint }>({});

  useEffect(() => {
    const fetchPrices = async () => {
      const pricesData: { [symbol: string]: bigint } = {};

      for (const { metadata } of balances || []) {
        const price = await invoke<string>("exchange_rates_get_price", {
          base_asset: metadata.symbol,
          quote_asset: "USD",
        });
        pricesData[metadata.symbol] = BigInt(price);
      }

      setPrices(pricesData);
    };

    fetchPrices();

    const interval = setInterval(fetchPrices, 30000);

    return () => clearInterval(interval);
  }, [balances]);

  useEffect(() => {
    let totalERC20Price = 0;
    (balances || []).forEach(({ balance, metadata }) => {
      const tokenPrice =
        (Number(prices[metadata?.symbol || ""]) * Number(balance)) /
          10 ** metadata?.decimals || 0;
      totalERC20Price += tokenPrice;
    });

    onPriceChange(totalERC20Price);
  }, [prices, balances, onPriceChange]);

  if (!currentNetwork) return null;

  const filteredBalances = (balances || []).filter(
    (token) => !settings?.hideEmptyTokens || BigInt(token.balance) > 0,
  );

  return (
    <>
      {filteredBalances.map(({ contract, balance, metadata }) => (
        <ERC20View
          key={contract}
          contract={contract}
          balance={BigInt(balance)}
          decimals={metadata?.decimals || 0}
          symbol={metadata?.symbol}
          chainId={currentNetwork.chain_id}
          price={Number(prices[metadata?.symbol || ""]) || null}
        />
      ))}
    </>
  );
}
