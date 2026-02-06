import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

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

export interface HdWallet {
  type: "HDWallet";
  count: number;
  name: string;
  current?: string[];
  mnemonic: string;
  derivationPath: string;
  password: string;
}

export interface JsonKeystoreWallet {
  type: "jsonKeystore";
  name: string;
  file: string;
  currentPath?: string;
}

export interface PrivateKeyWallet {
  type: "privateKey";
  name: string;
  address: string;
  privateKey: string;
  password: string;
}

export interface PlaintextWallet {
  type: "plaintext";
  name: string;
  mnemonic: string;
  derivationPath: string;
  count: number;
  currentPath?: string;
}

export interface ImpersonatorWallet {
  type: "impersonator";
  name: string;
  addresses: string[];
  current?: number;
}

export interface LedgerWallet {
  type: "ledger";
  name: string;
  addresses: [string, string][];
  current?: number;
}

export type Wallet =
  | HdWallet
  | JsonKeystoreWallet
  | PlaintextWallet
  | ImpersonatorWallet
  | LedgerWallet
  | PrivateKeyWallet;
