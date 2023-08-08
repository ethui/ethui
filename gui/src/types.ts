import { z } from "zod";

export const generalSettingsSchema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
  abiWatch: z.boolean(),
  abiWatchPath: z.string().optional().nullable(),
  alchemyApiKey: z.string().optional().nullable(),
  hideEmptyTokens: z.boolean(),
});

// const formSchema = schema.shape.network;
export const networkSchema = z.object({
  networks: z.array(
    z
      .object({
        name: z.string().min(1),
        explorer_url: z.string().optional().nullable(),
        http_url: z.string().min(1),
        ws_url: z.string().nullable().optional(),
        currency: z.string().min(1),
        chain_id: z.number(),
        decimals: z.number(),
      })
      .refine(
        (data) =>
          data.chain_id !== 31337 || (!!data.ws_url && data.ws_url.length > 0),
        {
          path: ["ws_url"],
          message: "WebSockets are mandatory for dev networks",
        }
      )
  ),
});

export const passwordSchema = z
  .string()
  .min(8, { message: "must be at least 8 characters long" })
  .regex(
    new RegExp("[^a-zA-Z0-9]"),
    "must have at least one special character"
  );

export const passwordFormSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: passwordSchema,
  })
  .refine((data) => data.password == data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "The two passwords don't match",
  });

export const mnemonicSchema = z
  .string()
  .regex(/^([a-z]+\s)+[a-z]+$/, {
    message: "Must be a list of english words",
  })
  .refine(
    (data) => {
      const words = data.split(/\s+/).length;
      return [12, 15, 18, 21, 24].includes(words);
    },
    {
      message:
        "Invalid number of words. Needs to be 12, 15, 18, 21 or 24 words long",
    }
  );

export const derivationPathSchema = z
  .string()
  .regex(/^m\/(\d+'?\/)+\d+$/, {
    message: "invalid path format",
  })
  .default("m/44'/60'/0'/0");

export const hdWalletSchema = z.object({
  type: z.literal("HDWallet"),
  count: z.number().int().min(1).max(100),
  name: z.string().min(1),
  current: z.array(z.string()).length(2).optional(),
  mnemonic: mnemonicSchema,
  derivationPath: derivationPathSchema,
  password: passwordSchema,
});

export const hdWalletUpdateSchema = hdWalletSchema.pick({
  type: true,
  name: true,
  derivationPath: true,
  count: true,
});

export const walletSchema = z.discriminatedUnion("type", [
  hdWalletSchema,
  z.object({
    type: z.literal("jsonKeystore"),
    name: z.string().min(1),
    file: z.string().min(1),
    currentPath: z.string().optional(),
  }),
  z.object({
    type: z.literal("plaintext"),
    name: z.string().min(1),
    dev: z.boolean().default(false),
    mnemonic: mnemonicSchema,
    derivationPath: derivationPathSchema,
    count: z.number().int().min(1),
    currentPath: z.string().optional(),
  }),
]);

export const walletTypes: Wallet["type"][] = Array.from(
  walletSchema.optionsMap.keys()
)
  .filter((k) => !!k)
  .map((k) => k as unknown as Wallet["type"]);

export const walletsSchema = z.object({
  wallets: z.array(walletSchema),
});

export type Address = `0x${string}`;
export type Wallet = z.infer<typeof walletSchema>;
export type Wallets = z.infer<typeof walletsSchema>;
export type Network = z.infer<typeof networkSchema.shape.networks>[number];
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;

export interface TokenBalance {
  contract: Address;
  balance: string;
  metadata: TokenMetadata;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

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

export interface Tx {
  hash: `0x${string}`;
  from: Address;
  to: Address;
  value: string;
  data: string;
  blockNumber: number;
  position: number;
  status: number;
}

export interface NftToken {
  hash: `0x${string}`;
  contract: Address;
  owner: Address;
  // metadata: JSON;
}

export interface Pagination {
  page?: number;
  page_size?: number;
}

export interface Paginated<T> {
  pagination: Pagination;
  items: T[];
  last: boolean;
  total: number;
}
