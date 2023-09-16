import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { z } from "zod";

export const generalSettingsSchema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
  abiWatch: z.boolean(),
  abiWatchPath: z.string().optional().nullable(),
  alchemyApiKey: z.string().optional().nullable(),
  etherscanApiKey: z.string().optional().nullable(),
  hideEmptyTokens: z.boolean(),
  onboarded: z.boolean(),
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
        },
      ),
  ),
});

export const passwordSchema = z
  .string()
  .min(8, { message: "must be at least 8 characters long" })
  .regex(
    new RegExp("[^a-zA-Z0-9]"),
    "must have at least one special character",
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
    },
  )
  .refine((data) => validateMnemonic(data, wordlist), {
    message: "Invalid mnemonic. You have have a typo or an unsupported word",
  });

export const derivationPathSchema = z
  .string()
  .regex(/^m\/(\d+'?\/)+\d+$/, {
    message: "invalid path format",
  })
  .default("m/44'/60'/0'/0");

export const addressSchema = z
  .string()
  .refine((data) => data.match(/^0x[a-fA-F0-9]{40}$/), {
    message: "not a valid ETH address",
  });

// react-hook-form doesn't support value-arrays, only object-arrays, so we need this type as a workaround for the impersonator form
export const addressOrObjectSchema = z.union([
  addressSchema,
  z.object({
    addressSchema,
  }),
]);

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

export const impersonatorSchema = z.object({
  type: z.literal("impersonator"),
  name: z.string().min(1),
  addresses: z.array(addressSchema).min(1),
  current: z.number().optional(),
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
  impersonatorSchema,
]);

export const walletTypes: Wallet["type"][] = Array.from(
  walletSchema.optionsMap.keys(),
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
  constant: boolean;
  type: string;
  stateMutability: string;
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

export interface Nft {
  contract: Address;
  token_id: string;
  owner: Address;
  name: string;
  symbol: string;
  uri: string;
  metadata: string;
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

export type Affinity = { sticky: number } | "global" | "unset";

export interface IContract {
  address: Address;
  abi: ABIItem[];
  name: string;
}
