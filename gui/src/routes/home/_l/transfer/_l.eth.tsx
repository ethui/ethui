import { addressSchema } from "@ethui/types/wallets";
import { Form } from "@ethui/ui/components/form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@ethui/ui/components/shadcn/alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { type Address, ethAddress, formatUnits } from "viem";
import { z } from "zod";
import { useShallow } from "zustand/shallow";
import { type AddressData, useAllAddresses } from "#/hooks/useAllAddresses";
import { useBalances } from "#/store/useBalances";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";
import { parseAmount, type Token } from "./-common";

export interface Params {
  chainId: string;
}

export const Route = createFileRoute("/home/_l/transfer/_l/eth")({
  beforeLoad: () => ({ breadcrumb: "ETH" }),
  loader: ({ params }: { params: Params }) => ({
    chainId: Number(params.chainId),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data: addresses } = useAllAddresses();
  const addressList: AddressData[] = addresses?.all || [];
  const network = useNetworks((s) => s.current);
  const address = useWallets((s) => s.address);
  const { native, erc20s } = useBalances(
    useShallow((s) => {
      return { native: s.nativeBalance, erc20s: s.erc20Balances };
    }),
  );
  const [result, setResult] = useState<string | null>(null);
  const [decimals, setDecimals] = useState<number>();

  // map list of tokens
  const [tokens, setTokens] = useState<Token[]>([]);
  useEffect(() => {
    if (!network || !native) return;

    const newTokens = erc20s.map(({ metadata, balance, contract }) => ({
      currency: metadata?.symbol,
      decimals: metadata?.decimals,
      balance: BigInt(balance),
      contract: contract,
    }));
    const nativeToken = {
      currency: network.currency,
      decimals: network.decimals,
      balance: native,
      contract: ethAddress,
    };
    setTokens([nativeToken, ...newTokens]);
  }, [native, erc20s, network]);

  const schema = z.object({
    to: addressSchema.optional(),
    currency: addressSchema,
    value: z.string().transform((val, ctx) => {
      try {
        return parseAmount(val, decimals || 0);
      } catch (_e) {
        ctx.addIssue({
          message: "Invalid value",
          code: "custom",
        });
        return z.NEVER;
      }
    }),
  });

  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(schema),
    // TODO: fix this any
    defaultValues: {
      currency: ethAddress,
      value: 0n,
    } as any,
  });

  const currency = form.watch("currency");
  const currentToken = tokens.find((t) => t.contract === currency);

  useEffect(() => {
    setDecimals(currentToken?.decimals);
  }, [currentToken]);

  // redirect if ERC20 is detected
  useEffect(() => {
    if (currentToken?.contract && currentToken?.contract !== ethAddress) {
      navigate({
        to: "/home/transfer/erc20",
        search: { contract: currentToken.contract },
      });
    }
  }, [currentToken, navigate]);

  if (!network || !address || !currentToken) return null;

  const onSubmit = async (data: FieldValues) => {
    console.log(data);
    const hash = await transferETH(address, data.to, data.value);
    setResult(hash);
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="p-2">
      <Form.Select
        name="currency"
        label="Token"
        items={tokens}
        toValue={(v) => v.contract}
        render={(v) => v.currency}
      />
      <span>
        Balance: {formatUnits(currentToken.balance, currentToken.decimals)}
      </span>
      <Form.AddressAutoCompleteTextInput
        placeholder="Search address"
        addresses={addressList}
        name="to"
        label="To"
        className="w-full"
      />
      <Form.Text label="Amount" name="value" className="w-full" />

      {form.formState.isSubmitted && result && (
        <Alert className="w-full">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Transaction sent!</AlertTitle>
          <AlertDescription className="break-all">{result}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Form.Submit label="Send" />
      </div>
    </Form>
  );
}

const transferETH = async (from: Address, to: Address, value: bigint) => {
  return await invoke<`0x${string}`>("rpc_send_transaction", {
    params: {
      from,
      to,
      value: value.toString(),
    },
  });
};
