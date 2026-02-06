import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

import { passwordSchema } from "./password";

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
  .refine(
    (mnemonic) => invoke<string>("wallets_validate_mnemonic", { mnemonic }),
    {
      message: "Invalid mnemonic. You may have a typo or an unsupported word",
    },
  );

export const derivationPathSchema = z
  .string()
  .regex(/^m\/(\d+'?\/)+\d+$/, {
    message: "invalid path format",
  })
  .min(1);

export const addressSchema = z
  .string()
  .startsWith("0x")
  .refine((data) => data.match(/^0x[a-fA-F0-9]{40}$/), {
    message: "Not a valid ETH address",
  });

export const hdWalletSchema = z.object({
  type: z.literal("HDWallet"),
  count: z.number().int().min(1).max(100),
  name: z.string().min(1),
  current: z.array(z.string()).length(2).optional(),
  mnemonic: mnemonicSchema,
  derivationPath: derivationPathSchema,
  password: passwordSchema,
});

export const jsonKeystoreSchema = z.object({
  type: z.literal("jsonKeystore"),
  name: z.string().min(1),
  file: z.string().min(1),
  currentPath: z.string().optional(),
});

export const privateKeySchema = z.object({
  type: z.literal("privateKey"),
  name: z.string().min(1),
  address: addressSchema,
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{128}$/),
  password: passwordSchema,
});

export const plaintextSchema = z.object({
  type: z.literal("plaintext"),
  name: z.string().min(1),
  mnemonic: mnemonicSchema,
  derivationPath: derivationPathSchema,
  count: z.number().int().min(1),
  currentPath: z.string().optional(),
});

export const impersonatorSchema = z.object({
  type: z.literal("impersonator"),
  name: z.string().min(1),
  addresses: z.array(addressSchema).min(1),
  current: z.number().optional(),
});

export const ledgerSchema = z.object({
  type: z.literal("ledger"),
  name: z.string().min(1),
  addresses: z.array(z.tuple([z.string(), addressSchema])),
  current: z.number().optional(),
});

export const walletSchema = z.discriminatedUnion("type", [
  hdWalletSchema,
  jsonKeystoreSchema,
  plaintextSchema,
  impersonatorSchema,
  ledgerSchema,
  privateKeySchema,
]);

export type Wallet = z.infer<typeof walletSchema>;
export type HdWallet = z.infer<typeof hdWalletSchema>;
export type JsonKeystoreWallet = z.infer<typeof jsonKeystoreSchema>;
export type PlaintextWallet = z.infer<typeof plaintextSchema>;
export type ImpersonatorWallet = z.infer<typeof impersonatorSchema>;
export type LedgerWallet = z.infer<typeof ledgerSchema>;
export type PrivateKeyWallet = z.infer<typeof privateKeySchema>;
