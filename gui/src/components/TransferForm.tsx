import { addressSchema } from "@ethui/types/wallets";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@ethui/ui/components/shadcn/alert";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { useShallow } from "zustand/shallow";
import {
  type AbiItem,
  type Address,
  encodeFunctionData,
  formatUnits,
  getAddress,
  parseAbiItem,
} from "viem";
import { z } from "zod";
import { useBalances } from "#/store/useBalances";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";

interface Token {
  currency?: string;
  decimals: number;
  balance: bigint;
  contract: Address;
}

interface TransferFormProps {
  contract?: Address;
  onClose: () => void;
}

const ZeroAddress = getAddress("0x0000000000000000000000000000000000000000");

export function TransferForm({
  contract = ZeroAddress,
  onClose,
}: TransferFormProps) {
  const network = useNetworks((s) => s.current);
  const address = useWallets((s) => s.address);
  const { native, erc20s } = useBalances(
    useShallow((s) => {
      return { native: s.nativeBalance, erc20s: s.erc20Balances };
    }),
  );
  const [result, setResult] = useState<string | null>(null);

  // map list of tokens
  const [tokens, setTokens] = useState<Map<Address, Token>>(new Map());
  useEffect(() => {
    if (!network || !native) return;

    const newTokens = new Map<Address, Token>(
      erc20s.map(({ metadata, balance, contract }) => [
        contract,
        {
          currency: metadata?.symbol,
          decimals: metadata?.decimals,
          balance: BigInt(balance),
          contract: contract,
        },
      ]),
    );
    newTokens.set(ZeroAddress, {
      decimals: network.decimals,
      currency: network.currency,
      balance: native,
      contract: ZeroAddress,
    });
    setTokens(newTokens);
  }, [native, erc20s, network]);

  const schema = z.object({
    to: addressSchema.optional(),
    currency: addressSchema,
    value: z
      .bigint()
      .positive()
      .superRefine((value, ctx) => {
        if (!currentToken || value <= currentToken.balance) return;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Not enough balance",
        });
      }),
  });

  type Schema = z.infer<typeof schema>;

  const form = useForm<Schema>({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: {
      currency: contract,
      value: 0n,
    },
  });

  const currentToken = tokens.get(form.watch("currency") as Address)!;

  if (!network || !address || !currentToken) return null;

  const onSubmit = async (data: FieldValues) => {
    const { contract } = currentToken;
    const { to, value } = data;

    const hash =
      contract === ZeroAddress
        ? await transferNative(address, to, value)
        : await transferERC20(address, to, value, contract);

    setResult(hash);
  };

  return (
    <Form form={form} onSubmit={onSubmit}>
      <span>Transfer token</span>

      <Form.Select
        name="currency"
        label="Currency"
        items={Array.from(tokens.values())}
        toValue={(v) => v.contract}
        render={(v) => v.currency}
      />

      <span>
        Balance: {formatUnits(currentToken.balance, currentToken.decimals)}
      </span>

      <Form.Text label="To" name="to" />
      <Form.BigInt
        label="Amount"
        name="value"
        decimals={currentToken.decimals}
      />

      {result && (
        <Alert>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      )}

      <div className=" flex w-full justify-between">
        <Button variant="outline" color="error" onClick={onClose}>
          Close
        </Button>

        <Form.Submit label="Send" />
      </div>
    </Form>
  );
}

const transferNative = async (from: Address, to: Address, value: bigint) => {
  return await invoke<`0x${string}`>("rpc_send_transaction", {
    params: {
      from,
      to,
      value,
    },
  });
};

const erc20transfer: AbiItem = parseAbiItem(
  "function transfer(address to, uint amount) returns (bool)",
);

const transferERC20 = async (
  from: Address,
  to: Address,
  value: bigint,
  contract: Address,
) => {
  const data = encodeFunctionData({
    abi: [erc20transfer],
    args: [to, value],
  });

  return await invoke<`0x${string}`>("rpc_send_transaction", {
    params: {
      from,
      to: contract,
      data,
    },
  });
};
