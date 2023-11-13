import SendIcon from "@mui/icons-material/Send";
import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import truncateEthAddress from "truncate-eth-address";
import { Address, encodeFunctionData, formatUnits } from "viem";

import { useInvoke } from "@/hooks";
import { useBalances, useNetworks, useWallets } from "@/store";
import { GeneralSettings } from "@/types";

import { CopyToClipboard, IconCrypto } from "./";
import { Abi, AbiFunction } from "abitype";

export function BalancesList() {
  return (
    <List>
      <BalanceETH />
      <BalancesERC20 />
    </List>
  );
}

function BalanceETH() {
  const currentNetwork = useNetworks((s) => s.current);
  const balance = useBalances((s) => s.nativeBalance);
  const address = useWallets((s) => s.address);

  if (!currentNetwork || !balance) return null;

  const send = async () => {
    const result = await invoke<string>("rpc_send_transaction", {
      params: {
        from: address,
        to: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        value: 10000000000000000000n,
        data: "",
      },
    });

    console.log(result);
  };

  return (
    <BalanceItem
      balance={balance}
      decimals={currentNetwork.decimals}
      symbol={currentNetwork.currency}
      transfer={send}
    />
  );
}

function BalancesERC20() {
  const balances = useBalances((s) => s.erc20Balances);
  const address = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);

  const { data: settings } = useInvoke<GeneralSettings>("settings_get");

  const filteredBalances = (balances || []).filter(
    (token) => !settings?.hideEmptyTokens || BigInt(token.balance) > 0
  );

  const send = async (contract: string) => {
    const abi = await invoke<Abi>("get_contract_abi", {
      address: contract,
      chainId,
    });

    const transferFunction = abi.find(
      (f) => f.type === "function" && f.name === "transfer"
    ) as AbiFunction;

    const data = encodeFunctionData({
      abi: [transferFunction],
      functionName: transferFunction.name,
      args: [
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        1000000000000000000n,
      ],
    });

    const result = await invoke<string>("rpc_send_transaction", {
      params: {
        from: address,
        to: contract,
        data,
      },
    });

    console.log(result);
  };

  return (
    <>
      {filteredBalances.map(({ contract, balance, metadata }) => (
        <BalanceItem
          key={contract}
          contract={contract}
          balance={BigInt(balance)}
          decimals={metadata.decimals}
          symbol={metadata.symbol}
          transfer={() => send(contract)}
        />
      ))}
    </>
  );
}

interface BalanceItemProps {
  contract?: Address;
  balance: bigint;
  decimals: number;
  symbol: string;
  transfer?: VoidFunction;
}

function BalanceItem({
  balance,
  decimals,
  symbol,
  contract,
  transfer,
}: BalanceItemProps) {
  const minimum = 0.001;
  // Some tokens respond with 1 decimals, that breaks this truncatedBalance without the Math.ceil
  const truncatedBalance =
    balance - (balance % BigInt(Math.ceil(minimum * 10 ** decimals)));

  if (!symbol || !decimals) return null;

  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar>
          <IconCrypto ticker={symbol} />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        secondary={`${symbol} ${
          contract ? `(${truncateEthAddress(contract)})` : ``
        }`}
      >
        <CopyToClipboard label={balance.toString()}>
          {truncatedBalance > 0
            ? formatUnits(truncatedBalance, decimals)
            : `< ${minimum}`}
        </CopyToClipboard>
      </ListItemText>
      <ListItemButton onClick={transfer}>
        <SendIcon></SendIcon>
      </ListItemButton>
    </ListItem>
  );
}
