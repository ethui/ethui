import { CallMade, NoteAdd, VerticalAlignBottom } from "@mui/icons-material";
import {
  Badge,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  Stack,
  Typography,
} from "@mui/material";
import { createElement } from "react";
import { formatEther } from "viem";

import { useInvoke, useRefreshTransactions } from "../hooks";
import { useNetworks, useWallets } from "../store";
import { Address, Tx } from "../types";
import { AddressView, ContextMenu, Panel } from "./";

export function Txs() {
  const account = useWallets((s) => s.address);
  const chainId = useNetworks((s) => s.current?.chain_id);
  const { data: txs, mutate } = useInvoke<Tx[]>("db_get_transactions", {
    address: account,
    chainId,
  });
  console.log(txs);

  useRefreshTransactions(mutate);

  if (!account) return null;

  return (
    <Panel>
      <List>
        {(txs || []).map((tx) => (
          <Receipt account={account} tx={tx} key={tx.hash} />
        ))}
      </List>
    </Panel>
  );
}

interface ReceiptProps {
  account: Address;
  tx: Tx;
}

function Receipt({ account, tx }: ReceiptProps) {
  const value = BigInt(tx.value);

  return (
    <ListItem>
      <ListItemAvatar>
        <Icon {...{ tx, account }} />
      </ListItemAvatar>
      <Box sx={{ flexGrow: 1 }}>
        <Stack>
          <Stack direction="row" spacing={1}>
            <AddressView address={tx.from} /> <span>→</span>
            {tx.to ? (
              <AddressView address={tx.to} />
            ) : (
              <Typography component="span">Contract Deploy</Typography>
            )}
          </Stack>
          <Typography variant="caption" fontSize="xl">
            Block #{tx.blockNumber?.toLocaleString()}
          </Typography>
        </Stack>
      </Box>
      <Box>
        {value > 0n && (
          <ContextMenu copy={value.toString()}>
            {formatEther(value)} Ξ
          </ContextMenu>
        )}
      </Box>
    </ListItem>
  );
}

interface IconProps {
  account: Address;
  tx: Tx;
}

function Icon({ account, tx }: IconProps) {
  const color = tx.status === 1 ? "success" : "error";

  let icon = CallMade;

  if (tx.to == account) {
    icon = VerticalAlignBottom;
  } else if (!tx.to) {
    icon = NoteAdd;
  }

  return <Badge>{createElement(icon, { color })}</Badge>;
}
