import { z } from "zod";

export const generalSettingsSchema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
  abiWatch: z.boolean().default(false),
  abiWatchPath: z.string().optional(),
});

// const formSchema = schema.shape.network;
export const networkSchema = z.object({
  networks: z.array(
    z
      .object({
        name: z.string().min(1),
        dev: z.boolean().default(false),
        explorer_url: z.string().optional().nullable(),
        http_url: z.string().min(1),
        ws_url: z.string().nullable().optional(),
        currency: z.string().min(1),
        chain_id: z.number(),
        decimals: z.number(),
      })
      .refine((data) => !data.dev || !data.ws_url || data.ws_url.length > 0, {
        path: ["ws_url"],
        message: "WebSockets are mandatory for dev networks",
      })
  ),
});

export const walletSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("plaintext"),
    name: z.string().min(1),
    dev: z.boolean().default(false),
    mnemonic: z.string().regex(/^(\w+\s){11}\w+$/, {
      message: "Must be a 12-word phrase",
    }),
    derivationPath: z.string().regex(/^m\/(\d+'?\/)+\d+$/, {
      message: "invalid path format",
    }),
    count: z.number().int().min(1),
    currentPath: z.string().optional(),
  }),
  z.object({
    type: z.literal("jsonKeystore"),
    name: z.string().min(1),
    path: z.string().min(1),
    currentPath: z.string().optional(),
  }),
]);

export const walletTypes: Wallet["type"][] = Array.from(
  walletSchema.optionsMap.keys()
)
  .filter((x) => !!x)
  .map((k) => k!.toString() as unknown as Wallet["type"]);

export const walletsSchema = z.object({
  wallets: z.array(walletSchema),
});

export type Address = `0x${string}`;
export type Wallet = z.infer<typeof walletSchema>;
export type Wallets = z.infer<typeof walletsSchema>;
export type Network = z.infer<typeof networkSchema.shape.networks>[number];
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;

export interface ABIFunctionInput {
  name: string;
  type: string;
}

export interface ABIItem {
  name: string;
  type: "error" | "function" | "constructor";
  stateMutability: "view" | "pure" | "nonpayable" | "payable";
  inputs: ABIFunctionInput[];
}

export interface ABIMatch {
  name: string;
  abi: ABIItem[];
}
