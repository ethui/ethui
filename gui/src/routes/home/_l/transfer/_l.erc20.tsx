import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { addressSchema } from "@ethui/types/wallets";
import { Form } from "@ethui/ui/components/form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@ethui/ui/components/shadcn/alert";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import {
  type AbiItem,
  type Address,
  encodeFunctionData,
  formatUnits,
  getAddress,
  parseAbiItem,
} from "viem";
import { z } from "zod";
import { useShallow } from "zustand/shallow";
import { useBalances } from "#/store/useBalances";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";

import { zodValidator } from "@tanstack/zod-adapter";
import { Terminal } from "lucide-react";

interface Params {
  chainId: string;
  contract: string;
}

const ZeroAddress = getAddress("0x0000000000000000000000000000000000000000");

const searchSchema = z.object({
  contract: z.string().optional(),
});

export const Route = createFileRoute("/home/_l/transfer/_l/erc20")({
  beforeLoad: () => ({ breadcrumb: "ERC20" }),
  validateSearch: zodValidator(searchSchema),
  loader: ({ params }: { params: Params }) => ({
    chainId: Number(params.chainId),
    contract: params.contract,
  }),

  component: RouteComponent,
});

interface Token {
  currency?: string;
  decimals: number;
  balance: bigint;
  contract: Address;
}

function RouteComponent() {
  const { contract } = Route.useSearch();

  const network = useNetworks((s) => s.current);
  const address = useWallets((s) => s.address);
  const { native, erc20s } = useBalances(
    useShallow((s) => {
      return { native: s.nativeBalance, erc20s: s.erc20Balances };
    }),
  );
  const [result, setResult] = useState<string | null>(null);

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
      contract: ZeroAddress,
    };
    setTokens([nativeToken, ...newTokens]);
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
  console.log(form.formState.isSubmitting);

  const currency = form.watch("currency");
  const currentToken = tokens.find((t) => t.contract === currency);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentToken?.contract === ZeroAddress) {
      console.log("redirecting");
      navigate({ to: "/home/transfer/native" });
    }
  }, [currentToken, navigate]);

  if (!network || !address || !currentToken) return null;

  const onSubmit = async (data: FieldValues) => {
    const { contract } = currentToken;
    const { to, value } = data;
    const hash = await transferERC20(address, to, value, contract);
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
      <Form.Text label="To" name="to" className="w-full" />
      <Form.BigInt
        label="Amount"
        name="value"
        decimals={currentToken.decimals}
        className="w-full"
      />
      {form.formState.isSubmitted && result && (
        <Alert className="w-full">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Transaction sent!</AlertTitle>
          <AlertDescription className="max-w-full overflow-hidden break-all">
            {result}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button variant="outline" color="error" asChild>
          <Link to="/home/account">Close</Link>
        </Button>

        <Form.Submit label="Send" />
      </div>
    </Form>
  );
}

const transferERC20 = async (
  from: Address,
  to: Address,
  value: bigint,
  contract: Address,
) => {
  const data = encodeFunctionData({
    abi: [
      parseAbiItem("function transfer(address to, uint amount) returns (bool)"),
    ],
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
