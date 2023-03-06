import * as Constants from "@iron/constants";
import { SettingsSection } from ".";
import * as z from "zod";
import { deriveAddress } from "../addresses";
import { ethers } from "ethers";
import { type Stream } from "stream";

const schema = z.object({
  mnemonic: z
    .string()
    .regex(/^(\w+\s){11}\w+$/, { message: "Must be a 12-word phrase" }),
  derivationPath: z
    .string()
    .regex(/^m\/(\d+'?\/)+\d+$/, { message: "invalid path format" }),
  addressIndex: z.number().int().min(0).max(3),
});

export type WalletSchema = z.infer<typeof schema>;

interface ExtraFields {
  address: string;
}

export type WalletFullSchema = WalletSchema & ExtraFields;

export const WalletSettings: SettingsSection<WalletSchema, ExtraFields> = {
  schema,

  defaults() {
    return {
      mnemonic: Constants.wallet.mnemonic,
      derivationPath: Constants.wallet.path,
      addressIndex: Constants.wallet.index,
      address: deriveAddress(
        Constants.wallet.mnemonic,
        Constants.wallet.path,
        Constants.wallet.index
      ),
    };
  },

  beforeUpdate(settings, oldSettings, stream) {
    const { mnemonic, derivationPath, addressIndex } = settings;
    const walletNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
    const childNode = walletNode.derivePath(
      `${derivationPath}/${addressIndex}`
    );
    const address = childNode.address;

    const addressChanged = address != oldSettings.address;

    if (addressChanged) {
      stream.write({
        type: "broadcast",
        payload: {
          method: "accountsChanged",
          params: [address],
        },
      });
    }

    return {
      ...settings,
      address,
    };
  },
};
